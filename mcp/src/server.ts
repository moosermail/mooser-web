import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";

const RESEND_API  = "https://api.resend.com";
const PORT        = parseInt(process.env.PORT ?? "4001");
const API_KEY     = process.env.RESEND_API_KEY;
const FROM_ADDR   = process.env.FROM_ADDRESS;
const SEND_ENABLED = process.env.SEND_ENABLED === "true";

if (!API_KEY) {
  console.error("RESEND_API_KEY is not set");
  process.exit(1);
}

async function resendFetch(method: string, path: string, body?: object) {
  const res = await fetch(`${RESEND_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((json.message as string) ?? `HTTP ${res.status}`);
  return json;
}

function makeServer() {
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
            limit: {
              type: "number",
              description: "How many to return. Default 20, max 100.",
            },
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
        description:
          "Compose an email draft. Returns the draft text for your review. Does NOT send anything.",
        inputSchema: {
          type: "object",
          required: ["to", "subject", "body"],
          properties: {
            to:      { type: "string", description: "Recipient address." },
            subject: { type: "string", description: "Subject line." },
            body:    { type: "string", description: "Plain text body." },
            cc:      { type: "string", description: "CC address (optional)." },
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
            to:      { type: "string", description: "Recipient address." },
            subject: { type: "string", description: "Subject line." },
            body:    { type: "string", description: "Plain text body." },
            cc:      { type: "string", description: "CC address (optional)." },
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
        const data  = await resendFetch("GET", `/emails/receiving?limit=${limit}`) as { data?: Record<string, unknown>[] };
        const emails = data.data ?? [];

        if (emails.length === 0) {
          return { content: [{ type: "text", text: "Inbox is empty." }] };
        }

        const lines = emails.map((e, i) =>
          `${i + 1}. [${e.id}]\n   From: ${e.from}\n   Subject: ${e.subject}\n   Date: ${e.created_at}`
        );
        return { content: [{ type: "text", text: lines.join("\n\n") }] };
      }

      case "read_email": {
        const email = await resendFetch("GET", `/emails/receiving/${a.id}`) as Record<string, unknown>;
        const to    = (email.to as string[] ?? []).join(", ");
        const body  = (email.text as string) || (email.html as string) || "(no body)";
        const text  = [
          `From:    ${email.from}`,
          `To:      ${to}`,
          `Subject: ${email.subject}`,
          `Date:    ${email.created_at}`,
          "",
          body,
        ].join("\n");
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
            content: [{
              type: "text",
              text: "Sending is disabled. The server operator must set SEND_ENABLED=true to allow agents to send email.",
            }],
            isError: true,
          };
        }
        if (!FROM_ADDR) {
          return {
            content: [{ type: "text", text: "FROM_ADDRESS environment variable is not configured on this server." }],
            isError: true,
          };
        }
        const payload: Record<string, unknown> = {
          from:    FROM_ADDR,
          to:      [a.to],
          subject: a.subject,
          text:    a.body,
        };
        if (a.cc) payload.cc = [a.cc];

        const result = await resendFetch("POST", "/emails", payload) as { id?: string };
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

app.post("/mcp", async (req: Request, res: Response) => {
  const server    = makeServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on("finish", () => server.close());
});

app.get("/mcp", async (req: Request, res: Response) => {
  const server    = makeServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

app.delete("/mcp", (_req, res) => { res.status(405).end(); });

app.get("/health", (_req, res) => {
  res.json({ ok: true, send_enabled: SEND_ENABLED });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`moosermail-mcp  →  127.0.0.1:${PORT}/mcp`);
  console.log(`send_enabled    →  ${SEND_ENABLED}`);
});
