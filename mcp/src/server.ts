import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const RESEND_API   = "https://api.resend.com";
const PORT         = parseInt(process.env.PORT ?? "4001");
const SEND_ENABLED = process.env.SEND_ENABLED === "true";

const SUPABASE_URL              = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Auth helpers ──────────────────────────────────────────────

/** Verify Supabase JWT and return the user object, or null. */
async function verifyJWT(token: string): Promise<{ id: string; email: string | undefined } | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    if (!res.ok) return null;
    const user = await res.json() as { id: string; email?: string };
    if (!user?.id) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

/** Check that the user has an active Pro plan. */
async function checkProPlan(userId: string): Promise<boolean> {
  const { data } = await serviceClient
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", userId)
    .single();
  return data?.plan === "pro" && data?.subscription_status === "active";
}

/** Retrieve and decrypt the user's Resend API key + from_address from Vault. */
async function getResendKey(userId: string): Promise<{ apiKey: string; fromAddress: string } | null> {
  // Get the vault_secret_id for this user
  const { data: keyRow } = await serviceClient
    .from("resend_keys")
    .select("vault_secret_id, from_address")
    .eq("user_id", userId)
    .single();

  if (!keyRow) return null;

  // Decrypt from Vault using service role
  const { data: vaultRow } = await serviceClient
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .eq("id", keyRow.vault_secret_id)
    .single();

  if (!vaultRow?.decrypted_secret) return null;

  return {
    apiKey:      vaultRow.decrypted_secret as string,
    fromAddress: keyRow.from_address as string,
  };
}

// ── Resend API wrapper ────────────────────────────────────────

async function resendFetch(apiKey: string, method: string, path: string, body?: object) {
  const res = await fetch(`${RESEND_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((json.message as string) ?? `HTTP ${res.status}`);
  return json;
}

// ── MCP server factory ────────────────────────────────────────

function makeServer(apiKey: string, fromAddress: string) {
  const server = new Server(
    { name: "moosermail", version: "2.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_emails",
        description: "List emails in the Moosermail inbox.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "How many to return. Default 20, max 100." },
          },
        },
      },
      {
        name: "read_email",
        description: "Read a specific email in full by its ID.",
        inputSchema: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "Email ID from list_emails." },
          },
        },
      },
      {
        name: "write_draft",
        description: "Compose an email draft. Returns the draft for review. Does NOT send anything.",
        inputSchema: {
          type: "object",
          required: ["to", "subject", "body"],
          properties: {
            to:      { type: "string" },
            subject: { type: "string" },
            body:    { type: "string" },
            cc:      { type: "string" },
          },
        },
      },
      {
        name: "send_email",
        description: SEND_ENABLED
          ? "Send an email via Resend. Sending is ENABLED on this server."
          : "Send an email via Resend. DISABLED — the server operator must set SEND_ENABLED=true to allow this.",
        inputSchema: {
          type: "object",
          required: ["to", "subject", "body"],
          properties: {
            to:      { type: "string" },
            subject: { type: "string" },
            body:    { type: "string" },
            cc:      { type: "string" },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    const a = args as Record<string, string | number>;

    switch (name) {
      case "list_emails": {
        const limit = Math.min(Number(a.limit ?? 20), 100);
        const data  = await resendFetch(apiKey, "GET", `/emails/receiving?limit=${limit}`) as { data?: Record<string, unknown>[] };
        const emails = data.data ?? [];
        if (emails.length === 0) return { content: [{ type: "text", text: "Inbox is empty." }] };
        const lines = emails.map((e, i) =>
          `${i + 1}. [${e.id}]\n   From: ${e.from}\n   Subject: ${e.subject}\n   Date: ${e.created_at}`
        );
        return { content: [{ type: "text", text: lines.join("\n\n") }] };
      }

      case "read_email": {
        const email = await resendFetch(apiKey, "GET", `/emails/receiving/${a.id}`) as Record<string, unknown>;
        const to    = (email.to as string[] ?? []).join(", ");
        const body  = (email.text as string) || (email.html as string) || "(no body)";
        const text  = [`From:    ${email.from}`, `To:      ${to}`, `Subject: ${email.subject}`, `Date:    ${email.created_at}`, "", body].join("\n");
        return { content: [{ type: "text", text }] };
      }

      case "write_draft": {
        const lines = [
          "DRAFT — NOT SENT",
          "─────────────────────────",
          `To:      ${a.to}`,
          ...(a.cc ? [`CC:      ${a.cc}`] : []),
          `Subject: ${a.subject}`,
          "",
          String(a.body),
        ];
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      case "send_email": {
        if (!SEND_ENABLED) {
          return {
            content: [{ type: "text", text: "Sending is disabled. The server operator must set SEND_ENABLED=true to allow agents to send email." }],
            isError: true,
          };
        }
        const payload: Record<string, unknown> = {
          from: fromAddress, to: [a.to], subject: a.subject, text: a.body,
        };
        if (a.cc) payload.cc = [a.cc];
        const result = await resendFetch(apiKey, "POST", "/emails", payload) as { id?: string };
        return { content: [{ type: "text", text: `Sent. Resend ID: ${result.id}` }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

// ── Express app ───────────────────────────────────────────────

const app = express();
app.use(express.json());

/** Authenticate request via Supabase JWT, check Pro plan, decrypt Resend key. */
async function authenticate(req: Request, res: Response): Promise<{ apiKey: string; fromAddress: string } | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Authorization: Bearer <supabase_access_token>" });
    return null;
  }

  const token = auth.slice(7).trim();

  const user = await verifyJWT(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired Supabase token" });
    return null;
  }

  const isPro = await checkProPlan(user.id);
  if (!isPro) {
    res.status(403).json({
      error: "MCP access requires the Pro plan ($6.99/mo). Upgrade at https://app.mooser.email/billing",
    });
    return null;
  }

  const credentials = await getResendKey(user.id);
  if (!credentials) {
    res.status(403).json({
      error: "No Resend API key found. Add your key at https://app.mooser.email/settings",
    });
    return null;
  }

  return credentials;
}

app.post("/mcp", async (req: Request, res: Response) => {
  const creds = await authenticate(req, res);
  if (!creds) return;
  const server    = makeServer(creds.apiKey, creds.fromAddress);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on("finish", () => server.close());
});

app.get("/mcp", async (req: Request, res: Response) => {
  const creds = await authenticate(req, res);
  if (!creds) return;
  const server    = makeServer(creds.apiKey, creds.fromAddress);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

app.delete("/mcp", (_req, res) => { res.status(405).end(); });

app.get("/health", (_req, res) => {
  res.json({ ok: true, send_enabled: SEND_ENABLED, auth: "supabase-jwt" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`moosermail-mcp  →  0.0.0.0:${PORT}/mcp`);
  console.log(`send_enabled    →  ${SEND_ENABLED}`);
  console.log(`auth            →  Authorization: Bearer <supabase_access_token>`);
  console.log(`supabase        →  ${SUPABASE_URL}`);
});
