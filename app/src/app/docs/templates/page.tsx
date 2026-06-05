export const metadata = {
  title: "Templates | Moosermail Docs",
  description: "Create reusable email templates with variable substitution in Moosermail.",
};

export default function TemplatesPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", marginBottom: ".5rem" }}>TEMPLATES</h1>
      <p style={{ color: "var(--grey)", fontSize: ".9rem", lineHeight: 1.8, marginBottom: "2rem" }}>
        Reusable email designs with variable substitution. Create once, send with different data every time.
        Variables use double-brace syntax:{" "}
        <code style={{ background: "var(--mid)", padding: ".1rem .4rem", borderRadius: 4 }}>{"{{name}}"}</code>.
      </p>

      <Endpoint method="GET" path="/api/templates" />
      <P>List all templates. Returns <code>{"{ templates: [...] }"}</code>.</P>

      <Endpoint method="POST" path="/api/templates" />
      <P>Create a template.</P>
      <H3>REQUEST</H3>
      <Pre>{`{
  "name": "Order Confirmation",
  "subject": "Order #{{order_id}} confirmed",
  "body_html": "<h1>Thanks {{name}}!</h1><p>Order #{{order_id}} is confirmed. Total: {{total}}.</p>",
  "body_text": "Thanks {{name}}! Order #{{order_id}} is confirmed. Total: {{total}}."
}`}</Pre>
      <H3>RESPONSE (201)</H3>
      <Pre>{`{
  "template": {
    "id": "uuid",
    "name": "Order Confirmation",
    "subject": "Order #{{order_id}} confirmed",
    "body_html": "...",
    "body_text": "...",
    "variables": ["order_id", "name", "total"],
    "created_at": "2026-03-23T12:00:00Z"
  }
}`}</Pre>
      <P>Variables are auto-extracted from the subject, HTML body, and text body combined. No need to declare them manually.</P>

      <Endpoint method="GET" path="/api/templates/:id" />
      <P>Get a single template with full body content.</P>

      <Endpoint method="PUT" path="/api/templates/:id" />
      <P>Update any fields. Variables are re-extracted on every save.</P>
      <Pre>{`curl -X PUT https://api.mooser.email/templates/UUID \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer TOKEN" \\
  -d '{"subject":"Updated subject for {{name}}"}'`}</Pre>

      <Endpoint method="DELETE" path="/api/templates/:id" />
      <P>Delete a template. Triggers and cron jobs using this template are also deleted (cascade).</P>

      <H2>VARIABLE SYNTAX</H2>
      <P>Any <code>{"{{word}}"}</code> in the subject, HTML body, or text body becomes a variable. At send time, pass values in the <code>variables</code> object:</P>
      <Pre>{`// In a trigger fire or cron job:
"variables": {
  "name": "Jane",
  "order_id": "12345",
  "total": "$49.99"
}

// Unmatched variables are left as-is: {{unknown}} stays as {{unknown}}`}</Pre>

      <H2>HTML TIPS</H2>
      <P>Email HTML is not web HTML. A few rules that will save you pain:</P>
      <ul style={{ color: "var(--grey)", fontSize: ".85rem", lineHeight: 2, paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        <li>Use inline styles, not stylesheets or <code>{"<style>"}</code> blocks</li>
        <li>Table-based layouts for multi-column designs (no flexbox, no grid)</li>
        <li>Avoid CSS properties that Outlook strips: border-radius, box-shadow, gradient backgrounds</li>
        <li>Set explicit width on <code>{"<img>"}</code> tags or they render full-size on some clients</li>
        <li>Test in both dark mode and light mode -- many clients invert colors unexpectedly</li>
      </ul>
      <P>Resend handles the actual delivery. Moosermail passes your HTML through unchanged.</P>
    </div>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  const colors: Record<string, string> = { GET: "#3b82f6", POST: "#ef4444", PUT: "#f59e0b", DELETE: "#e11d48" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".75rem", marginTop: "2rem" }}>
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
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: ".85rem", letterSpacing: ".12em", color: "var(--grey)", marginBottom: ".5rem", marginTop: "1.25rem" }}>{children}</h3>;
}
