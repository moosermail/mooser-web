export const metadata = {
  title: "MCP | Moosermail Docs",
  description: "Connect AI agents to your Moosermail inbox via the Model Context Protocol. 12 tools available.",
};

export default function McpPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", marginBottom: ".5rem" }}>MCP (AI AGENT ACCESS)</h1>
      <p style={{ color: "var(--grey)", fontSize: ".9rem", lineHeight: 1.8, marginBottom: "2rem" }}>
        Connect Claude and other AI agents to your Moosermail inbox via the Model Context Protocol.
        12 tools available. Agents can read emails, draft replies, send, manage templates, fire
        triggers, and view logs.
      </p>

      <H2>SETUP -- CLAUDE DESKTOP</H2>
      <P>Add to your <code>claude_desktop_config.json</code>:</P>
      <Pre>{`{
  "mcpServers": {
    "moosermail": {
      "type": "http",
      "url": "https://mcp.mooser.email/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}</Pre>

      <H2>SETUP -- CLAUDE CODE</H2>
      <P>Run once in your terminal:</P>
      <Pre>{`claude mcp add moosermail --transport http \\
  --url https://mcp.mooser.email/mcp \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</Pre>
      <P>Or add to your project&apos;s <code>.mcp.json</code> using the same config as Claude Desktop above.</P>

      <H2>GET YOUR TOKEN</H2>
      <P>
        The easiest way: go to Settings &gt; API Keys and create a key. Use the{" "}
        <code>mk_...</code> key as your Bearer token. It never expires unless you set an expiry.
      </P>
      <P>Or get a 24-hour session token via the API:</P>
      <Pre>{`curl -s https://api.mooser.email/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"..."}' | jq -r .token`}</Pre>

      <H2>AVAILABLE TOOLS (12)</H2>

      <H3>EMAIL</H3>
      <Table rows={[
        ["list_emails",   "List inbox emails. Param: limit (default 20, max 100). Hidden emails are excluded."],
        ["read_email",    "Read full email by ID including body, headers, and attachments."],
        ["write_draft",   "Compose a draft for review. Does NOT send -- use send_email to send."],
        ["send_email",    "Send an email directly. Requires SEND_ENABLED=true on the server."],
      ]} />

      <H3>TEMPLATES</H3>
      <Table rows={[
        ["list_templates",  "List all saved templates with names and variable lists."],
        ["get_template",    "Get a template by ID including full body and detected variables."],
        ["send_template",   "Send a template to one or more recipients with variable substitution."],
      ]} />

      <H3>TRIGGERS</H3>
      <Table rows={[
        ["list_triggers", "List API triggers with names, template associations, and enabled status."],
        ["fire_trigger",  "Fire a trigger by ID with optional to address and variables."],
      ]} />

      <H3>OTHER</H3>
      <Table rows={[
        ["list_cron_jobs", "List scheduled cron jobs with next run times."],
        ["list_pipes",     "List email processing pipes with match conditions and actions."],
        ["send_log",       "View recent automated send history (triggers, cron, pipe actions)."],
      ]} />

      <H2>EXAMPLE PROMPTS</H2>
      <ul style={{ color: "var(--grey)", fontSize: ".85rem", lineHeight: 2.4, paddingLeft: "1.25rem" }}>
        <li>&quot;Check my inbox and summarize any unread emails&quot;</li>
        <li>&quot;Draft a reply to the email from Bob about the Q4 report&quot;</li>
        <li>&quot;Send the welcome template to new-user@example.com with name=Sarah&quot;</li>
        <li>&quot;Fire the deploy-notification trigger with version=2.1.0&quot;</li>
        <li>&quot;Show me the last 10 sends from the send log&quot;</li>
        <li>&quot;List my templates and tell me which ones have undefined variables&quot;</li>
        <li>&quot;Create a pipe that auto-replies to any email with &apos;invoice&apos; in the subject&quot;</li>
      </ul>

      <H2>SECURITY</H2>
      <ul style={{ color: "var(--grey)", fontSize: ".85rem", lineHeight: 2, paddingLeft: "1.25rem" }}>
        <li>Every request is verified against your JWT or API key -- agents can only access your data</li>
        <li>Resend API keys are encrypted at rest and never exposed to the MCP layer</li>
        <li>send_email and send_template require <code>SEND_ENABLED=true</code> (server-level opt-in for self-hosters)</li>
        <li>Hidden emails are excluded from <code>list_emails</code></li>
        <li>The MCP server runs separately from the web app -- it can be disabled entirely without affecting the web inbox</li>
      </ul>
    </div>
  );
}

function Pre({ children }: { children: string }) {
  return <pre style={{ background: "var(--mid)", padding: "1rem", borderRadius: 8, fontSize: ".78rem", lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", marginBottom: ".75rem" }}>{children}</pre>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "var(--grey)", fontSize: ".85rem", lineHeight: 1.7, marginBottom: ".75rem" }}>{children}</p>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", marginBottom: "1rem", marginTop: "2rem" }}>{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: ".85rem", letterSpacing: ".12em", color: "var(--grey)", marginBottom: ".5rem", marginTop: "1.25rem" }}>{children}</h3>;
}
function Table({ rows }: { rows: string[][] }) {
  return (
    <table style={{ width: "100%", fontSize: ".8rem", borderCollapse: "collapse", marginBottom: ".75rem" }}>
      <tbody>
        {rows.map(([tool, desc]) => (
          <tr key={tool}>
            <td style={{ padding: ".5rem", borderBottom: "1px solid var(--mid)", color: "var(--fg)", fontFamily: "monospace", verticalAlign: "top", width: "28%" }}>{tool}</td>
            <td style={{ padding: ".5rem", borderBottom: "1px solid var(--mid)", color: "var(--grey)" }}>{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
