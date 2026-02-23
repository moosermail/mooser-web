import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";

const RESEND_API  = "https://api.resend.com";
const PORT        = parseInt(process.env.PORT ?? "4001");
const SEND_ENABLED = process.env.SEND_ENABLED === "true";

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

function makeServer(apiKey: string, fromAddress: string) {
  const server = new Server(
    { name: "moosermail", version: "1.0.0" },
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
          `DRAFT — NOT SENT`,
          `─────────────────────────`,
          `To:      ${a.to}`,
          ...(a.cc ? [`CC:      ${a.cc}`] : []),
          `Subject: ${a.subject}`,
          ``,
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
        if (!fromAddress) {
          return {
            content: [{ type: "text", text: "No from address. Pass X-From-Address header with your Resend sender address." }],
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

const app = express();
app.use(express.json());

function extractAuth(req: Request): { apiKey: string; fromAddress: string } | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const apiKey     = auth.slice(7).trim();
  const fromAddress = (req.headers["x-from-address"] as string) ?? "";
  return { apiKey, fromAddress };
}

app.post("/mcp", async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) { res.status(401).json({ error: "Missing Authorization: Bearer <resend_api_key>" }); return; }
  const server    = makeServer(auth.apiKey, auth.fromAddress);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on("finish", () => server.close());
});

app.get("/mcp", async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) { res.status(401).json({ error: "Missing Authorization: Bearer <resend_api_key>" }); return; }
  const server    = makeServer(auth.apiKey, auth.fromAddress);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

app.delete("/mcp", (_req, res) => { res.status(405).end(); });

app.get("/health", (_req, res) => {
  res.json({ ok: true, send_enabled: SEND_ENABLED });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`moosermail-mcp  →  0.0.0.0:${PORT}/mcp`);
  console.log(`send_enabled    →  ${SEND_ENABLED}`);
  console.log(`auth            →  Authorization: Bearer <resend_api_key>`);
  console.log(`from address    →  X-From-Address: <your@sender.com>`);
});
