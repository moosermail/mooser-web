export const metadata = {
  title: "Pipes | Moosermail Docs",
  description: "Auto-process incoming emails with Moosermail pipes. Webhook, forward, auto-reply, tag, or hide.",
};

export default function PipesPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", marginBottom: ".5rem" }}>PIPES</h1>
      <p style={{ color: "var(--grey)", fontSize: ".9rem", lineHeight: 1.8, marginBottom: "2rem" }}>
        Auto-process incoming emails. When a new email arrives that matches your conditions, Moosermail
        fires the action. Webhook to Slack, forward to a support inbox, auto-reply, tag, or hide.
        The worker checks every 30 seconds.
      </p>

      <Endpoint method="GET" path="/api/pipes" />
      <P>List all pipes.</P>

      <Endpoint method="POST" path="/api/pipes" />
      <P>Create a pipe.</P>
      <Pre>{`{
  "name": "Forward support to Slack",
  "action": "webhook",
  "match_subject": "support",
  "action_url": "https://hooks.slack.com/services/xxx",
  "strip_closers": true
}`}</Pre>

      <Endpoint method="PUT" path="/api/pipes/:id" />
      <P>Update any fields. Toggle <code>enabled</code> to pause without deleting.</P>

      <Endpoint method="DELETE" path="/api/pipes/:id" />
      <P>Delete a pipe.</P>

      <H2>MATCHING</H2>
      <P>Set one or more conditions. If any match (OR logic), the action fires. Or set <code>match_all: true</code> to run on every email.</P>
      <Table rows={[
        ["match_from",    "Substring match on sender address. Case-insensitive."],
        ["match_subject", "Substring match on subject line."],
        ["match_body",    "Substring match on plain text body."],
        ["match_all",     "Boolean. Skips all conditions and matches every incoming email."],
      ]} />

      <H2>ACTIONS</H2>
      <Table rows={[
        ["webhook",     "POSTs JSON to action_url. Payload: {id, from, subject, text, html, created_at, pipe_name}"],
        ["forward",     "Forwards the email to action_to. Adds 'Fwd:' prefix to subject."],
        ["auto_reply",  "Replies to the sender using the template at action_template_id. Auto-fills {{sender_name}}, {{sender_email}}, {{original_subject}}."],
        ["tag",         "Tags the email. action_tag accepts: flag, pin, or read."],
        ["hide",        "Hides the email from the inbox and from MCP agent list_emails."],
      ]} />

      <H2>CLOSER STRIPPING</H2>
      <P>Set <code>strip_closers: true</code> to remove common email footers before the action runs. Stripped patterns:</P>
      <ul style={{ color: "var(--grey)", fontSize: ".82rem", lineHeight: 2, paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        <li>Sent from my iPhone / iPad / Galaxy / Pixel / Huawei</li>
        <li>Get Outlook for iOS / Android</li>
        <li>Sent from Yahoo Mail / Mail for Windows / Mailspring / Superhuman</li>
        <li>Generic &quot;This message was sent from/via...&quot; patterns</li>
      </ul>
      <P>Useful for webhooks where you want the email body without mobile client signatures cluttering the payload.</P>

      <H2>EXAMPLES</H2>
      <Pre>{`# Webhook to Slack when "urgent" appears in subject
curl -X POST https://api.mooser.email/pipes \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer TOKEN" \\
  -d '{"name":"Urgent to Slack","action":"webhook","match_subject":"urgent","action_url":"https://hooks.slack.com/services/xxx"}'

# Auto-reply to sales inquiries with a template
curl -X POST https://api.mooser.email/pipes \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer TOKEN" \\
  -d '{"name":"Sales auto-reply","action":"auto_reply","match_subject":"pricing","action_template_id":"template-uuid"}'

# Forward all emails to a backup inbox with closer stripping
curl -X POST https://api.mooser.email/pipes \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer TOKEN" \\
  -d '{"name":"Backup","action":"forward","match_all":true,"action_to":"backup@gmail.com","strip_closers":true}'

# Auto-hide newsletters
curl -X POST https://api.mooser.email/pipes \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer TOKEN" \\
  -d '{"name":"Hide newsletters","action":"hide","match_from":"newsletter"}'`}</Pre>
    </div>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  const colors: Record<string, string> = { GET: "#3b82f6", POST: "#ef4444", PUT: "#f59e0b", DELETE: "#e11d48" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".75rem", marginTop: "1.5rem" }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: ".75rem", letterSpacing: ".1em", padding: ".25rem .6rem", borderRadius: 4, background: colors[method] || "#888", color: "#fff" }}>{method}</span>
      <code style={{ fontSize: ".9rem", color: "var(--fg)" }}>{path}</code>
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
function Table({ rows }: { rows: string[][] }) {
  return (
    <table style={{ width: "100%", fontSize: ".8rem", borderCollapse: "collapse", marginBottom: ".75rem" }}>
      <tbody>
        {rows.map(([key, desc]) => (
          <tr key={key}>
            <td style={{ padding: ".5rem", borderBottom: "1px solid var(--mid)", color: "var(--fg)", fontFamily: "monospace", verticalAlign: "top", width: "22%" }}>{key}</td>
            <td style={{ padding: ".5rem", borderBottom: "1px solid var(--mid)", color: "var(--grey)" }}>{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
