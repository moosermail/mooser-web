export const metadata = {
  title: "Send Log | Moosermail Docs",
  description: "View the history of all automated sends in Moosermail: triggers, cron jobs, and pipe actions.",
};

export default function SendLogPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", marginBottom: ".5rem" }}>SEND LOG</h1>
      <p style={{ color: "var(--grey)", fontSize: ".9rem", lineHeight: 1.8, marginBottom: "2rem" }}>
        View the history of all automated sends: triggers, cron jobs, and pipe actions.
        Returns the most recent 200 entries. The web inbox shows a live version of this under Send Log.
      </p>

      <Endpoint method="GET" path="/api/send-log" />
      <P>Returns the 200 most recent send log entries for your account, ordered newest first.</P>

      <H3>RESPONSE</H3>
      <Pre>{`{
  "logs": [
    {
      "id": "uuid",
      "to_address": "jane@example.com",
      "status": "sent",             // "sent" or "failed"
      "resend_id": "resend-id",     // null if failed
      "created_at": "2026-03-23T12:00:00Z",
      "template_name": "Welcome",   // null if not template-based
      "trigger_name": "New signup", // null if not trigger-based
      "cron_name": null,            // null if not cron-based
      "error": null                 // error message string if status is "failed"
    }
  ]
}`}</Pre>

      <H3>WHAT GETS LOGGED</H3>
      <ul style={{ color: "var(--grey)", fontSize: ".85rem", lineHeight: 2, paddingLeft: "1.25rem" }}>
        <li>Every trigger fire (via <code>/api/trigger/:key</code>)</li>
        <li>Every cron job execution</li>
        <li>Pipe auto-reply and forward actions</li>
        <li>Template sends via MCP (<code>send_template</code> tool)</li>
      </ul>
      <P>
        Manual sends from the compose page and the <code>/api/send</code> endpoint are <strong>not</strong> logged here.
        Those go through Resend directly and appear in Resend&apos;s dashboard and your Sent folder in the inbox.
      </P>

      <H3>FAILED SENDS</H3>
      <P>
        When <code>status</code> is <code>&quot;failed&quot;</code>, check the <code>error</code> field for the
        Resend API error message. Common causes: no Resend API key configured, Resend key lacks send permissions,
        from address not verified in Resend, or recipient email bounced.
      </P>
    </div>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  const colors: Record<string, string> = { GET: "#3b82f6", POST: "#ef4444" };
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
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: ".85rem", letterSpacing: ".12em", color: "var(--grey)", marginBottom: ".5rem", marginTop: "1.25rem" }}>{children}</h3>;
}
