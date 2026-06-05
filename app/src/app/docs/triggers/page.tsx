export const metadata = {
  title: "Triggers | Moosermail Docs",
  description: "API-triggered email sends with Moosermail. No auth needed to fire -- the trigger key is the auth.",
};

export default function TriggersPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", marginBottom: ".5rem" }}>TRIGGERS</h1>
      <p style={{ color: "var(--grey)", fontSize: ".9rem", lineHeight: 1.8, marginBottom: "2rem" }}>
        API-triggered email sends. Each trigger generates a unique key. Hit the public endpoint with that
        key and an email goes out. No Bearer auth needed to fire -- the key is the auth. Perfect for
        webhooks, CI/CD, form submissions, and third-party integrations.
      </p>

      <H2>MANAGEMENT (AUTH REQUIRED)</H2>

      <Endpoint method="GET" path="/api/triggers" />
      <P>List triggers with template names and enabled status.</P>

      <Endpoint method="POST" path="/api/triggers" />
      <P>Create a new trigger.</P>
      <Pre>{`{
  "name": "New signup",
  "template_id": "template-uuid",
  "default_to": "admin@company.com"   // optional fallback recipient
}`}</Pre>
      <P>
        Response includes a <code>trigger_key</code> -- a random 48-char hex string.
        This is the auth for the public endpoint. Treat it like a password.
      </P>

      <Endpoint method="PUT" path="/api/triggers/:id" />
      <P>Update name, template, default_to, or enabled status.</P>

      <Endpoint method="DELETE" path="/api/triggers/:id" />
      <P>Delete a trigger. Its key stops working immediately.</P>

      <Hr />
      <H2>PUBLIC FIRE ENDPOINT (NO AUTH)</H2>

      <Endpoint method="POST" path="/api/trigger/:key" />
      <P>Fire a trigger. The key in the URL is the only auth. Call from anywhere -- no Bearer token needed.</P>

      <H3>REQUEST</H3>
      <Pre>{`{
  "to": "jane@example.com",       // string or string[] -- optional if default_to is set
  "variables": {                   // optional -- fills {{placeholders}} in the template
    "name": "Jane",
    "company": "Acme"
  }
}`}</Pre>

      <H3>RESPONSE (200)</H3>
      <Pre>{`{"sent":1,"failed":0,"ids":["resend-id"]}`}</Pre>

      <H3>BEHAVIOR</H3>
      <ul style={{ color: "var(--grey)", fontSize: ".85rem", lineHeight: 2, paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        <li>If <code>to</code> is omitted, falls back to <code>default_to</code> from the trigger config</li>
        <li>If <code>to</code> is an array, each address gets a separate email</li>
        <li>If the trigger is disabled, returns 403</li>
        <li>All sends are logged in the send log</li>
      </ul>

      <H3>EXAMPLES</H3>
      <Pre>{`# Single recipient
curl -X POST https://api.mooser.email/trigger/YOUR_KEY \\
  -H "Content-Type: application/json" \\
  -d '{"to":"bob@example.com","variables":{"name":"Bob"}}'

# Multiple recipients (each gets their own email)
curl -X POST https://api.mooser.email/trigger/YOUR_KEY \\
  -H "Content-Type: application/json" \\
  -d '{"to":["alice@co.com","bob@co.com"],"variables":{"event":"Launch Day"}}'

# Use default_to -- no "to" field at all
curl -X POST https://api.mooser.email/trigger/YOUR_KEY \\
  -H "Content-Type: application/json" \\
  -d '{"variables":{"status":"deployed","version":"2.1.0"}}'`}</Pre>

      <H2>USE CASES</H2>
      <ul style={{ color: "var(--grey)", fontSize: ".85rem", lineHeight: 2.2, paddingLeft: "1.25rem" }}>
        <li><strong style={{ color: "var(--fg)" }}>Signup flow</strong> -- backend calls trigger on new user creation</li>
        <li><strong style={{ color: "var(--fg)" }}>Deploy notifications</strong> -- GitHub Actions fires trigger on successful deploy</li>
        <li><strong style={{ color: "var(--fg)" }}>Form submissions</strong> -- Zapier or Make catches a form fill, fires trigger with the data</li>
        <li><strong style={{ color: "var(--fg)" }}>Monitoring alerts</strong> -- UptimeRobot or Grafana webhook hits trigger on downtime</li>
        <li><strong style={{ color: "var(--fg)" }}>Order confirmations</strong> -- e-commerce backend fires trigger with order details</li>
        <li><strong style={{ color: "var(--fg)" }}>Password resets</strong> -- fire from your auth service with a reset link variable</li>
      </ul>
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
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: ".85rem", letterSpacing: ".12em", color: "var(--grey)", marginBottom: ".5rem", marginTop: "1.25rem" }}>{children}</h3>;
}
function Hr() {
  return <hr style={{ border: "none", borderTop: "1px solid var(--mid)", margin: "2rem 0" }} />;
}
