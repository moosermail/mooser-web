export const metadata = {
  title: "Quickstart | Moosermail Docs",
  description: "Go from zero to automated email in 5 minutes with Moosermail.",
};

export default function QuickstartPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", marginBottom: "1.5rem" }}>QUICKSTART</h1>
      <p style={{ color: "var(--grey)", fontSize: ".9rem", lineHeight: 1.8, marginBottom: "2rem" }}>
        Five steps from zero to automated emails. Takes about 5 minutes.
      </p>

      <Step n={1} title="CREATE AN ACCOUNT">
        <Pre>{`curl -X POST https://api.mooser.email/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your-password-here"}'

# Response: {"ok":true}`}</Pre>
        <P>Or sign up at <code>app.mooser.email/signup</code> in the browser.</P>
      </Step>

      <Step n={2} title="GET YOUR TOKEN">
        <Pre>{`curl -X POST https://api.mooser.email/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your-password-here"}'

# Response: {"token":"eyJhbGciOiJIUzI1NiIs..."}`}</Pre>
        <P>
          Save this token. You'll use it as <code>Authorization: Bearer TOKEN</code> on all
          authenticated endpoints. Tokens last 24 hours. For longer-lived access, create an API key
          in Settings -- they start with <code>mk_</code> and can be set to never expire.
        </P>
      </Step>

      <Step n={3} title="SAVE YOUR RESEND API KEY">
        <Pre>{`curl -X POST https://api.mooser.email/keys \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"api_key":"re_your_resend_key","from_address":"hello@yourdomain.com"}'

# Response: {"hint":"re__****xxxx","from_address":"hello@yourdomain.com"}`}</Pre>
        <P>
          Your Resend key needs <strong>Send</strong> and <strong>Receive Email</strong> permissions.
          The key is encrypted at rest with AES-256-GCM. The raw key is never readable -- not even
          server-side except at the moment it&apos;s used to send.
        </P>
      </Step>

      <Step n={4} title="CREATE A TEMPLATE">
        <Pre>{`curl -X POST https://api.mooser.email/templates \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "name": "Welcome Email",
    "subject": "Welcome to {{company}}, {{name}}!",
    "body_html": "<h1>Hey {{name}},</h1><p>Thanks for joining {{company}}.</p>",
    "body_text": "Hey {{name}}, Thanks for joining {{company}}."
  }'

# Response: {"template":{"id":"abc-123","name":"Welcome Email","variables":["company","name"],...}}`}</Pre>
        <P>
          Variables like <code>{"{{name}}"}</code> are auto-detected from your subject and body. No
          need to declare them. You fill them in when sending.
        </P>
      </Step>

      <Step n={5} title="CREATE A TRIGGER AND FIRE IT">
        <Pre>{`# Create the trigger
curl -X POST https://api.mooser.email/triggers \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"name":"New signup","template_id":"abc-123"}'

# Response: {"trigger":{"trigger_key":"a1b2c3d4e5f6...","name":"New signup",...}}

# Fire it -- no auth needed, the key IS the auth
curl -X POST https://api.mooser.email/trigger/a1b2c3d4e5f6... \\
  -H "Content-Type: application/json" \\
  -d '{"to":"jane@example.com","variables":{"name":"Jane","company":"Acme"}}'

# Response: {"sent":1,"failed":0,"ids":["resend-id-here"]}`}</Pre>
        <P>
          Jane gets a personalized welcome email. Call this from your backend on every signup, from a
          Zapier webhook, from CI/CD -- anywhere that can make an HTTP POST.
        </P>
      </Step>

      <H2>WHAT NEXT</H2>
      <ul style={{ color: "var(--grey)", fontSize: ".85rem", lineHeight: 2.2, paddingLeft: "1.25rem" }}>
        <li>Set up <strong>cron jobs</strong> for recurring sends (weekly digests, monthly reports)</li>
        <li>Create <strong>pipes</strong> to auto-forward, webhook, or auto-reply to incoming emails</li>
        <li>Connect <strong>Claude or other AI agents</strong> via MCP to read and send from your inbox</li>
        <li>Check the <strong>send log</strong> to see every automated send with its status</li>
        <li>Create persistent <strong>API keys</strong> in Settings for integrations that shouldn&apos;t expire</li>
      </ul>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: "1px solid var(--mid)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: "1rem" }}>
        <span style={{
          width: 28, height: 28, borderRadius: "50%", background: "var(--accent)",
          color: "var(--accent-text)", fontFamily: "'Bebas Neue', sans-serif", fontSize: ".9rem",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>{n}</span>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.3rem", letterSpacing: ".06em", margin: 0 }}>{title}</h2>
      </div>
      {children}
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
  return <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: ".06em", marginBottom: "1rem", marginTop: "1rem" }}>{children}</h2>;
}
