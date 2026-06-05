export const metadata = {
  title: "Auth | Moosermail Docs",
  description: "Moosermail authentication: JWT tokens, persistent API keys, login/signup/logout endpoints.",
};

export default function AuthDocs() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", marginBottom: ".5rem" }}>AUTH</h1>
      <p style={{ color: "var(--grey)", fontSize: ".9rem", lineHeight: 1.8, marginBottom: "1rem" }}>
        Two ways to authenticate API requests:
      </p>
      <div style={{ background: "var(--card)", border: "1px solid var(--mid)", borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "2rem", fontSize: ".85rem", lineHeight: 1.8 }}>
        <p style={{ color: "var(--fg)", fontWeight: 600, marginBottom: ".5rem" }}>1. API Keys (recommended)</p>
        <p style={{ color: "var(--grey)" }}>
          Go to Settings &gt; API Keys and create a key. Keys start with{" "}
          <code style={{ background: "var(--mid)", padding: ".1rem .35rem", borderRadius: 4 }}>mk_</code>{" "}
          and can be set to never expire. Use as{" "}
          <code style={{ background: "var(--mid)", padding: ".1rem .35rem", borderRadius: 4 }}>Authorization: Bearer mk_...</code>
        </p>
        <p style={{ color: "var(--fg)", fontWeight: 600, marginBottom: ".5rem", marginTop: "1rem" }}>2. JWT Session Tokens (fallback)</p>
        <p style={{ color: "var(--grey)" }}>
          Login returns a JWT that expires in 24 hours. You can also reveal your current token at
          Settings &gt; Session Token.
        </p>
      </div>

      <Endpoint method="POST" path="/api/auth/signup" />
      <P>Create a new account. No email verification required.</P>
      <H3>REQUEST</H3>
      <Pre>{`{"email":"user@example.com","password":"at-least-10-chars"}`}</Pre>
      <H3>RESPONSE (201)</H3>
      <Pre>{`{"ok":true}`}</Pre>
      <H3>ERRORS</H3>
      <Table rows={[
        ["400", "Email and password required / Invalid email / Password too short"],
        ["409 (silent)", "Account already exists -- returns 201 anyway to prevent user enumeration"],
      ]} />

      <Hr />
      <Endpoint method="POST" path="/api/auth/login" />
      <P>Returns a JWT and sets an httpOnly <code>mooser_token</code> cookie. Token expires in 24 hours.</P>
      <H3>REQUEST</H3>
      <Pre>{`{"email":"user@example.com","password":"your-password"}`}</Pre>
      <H3>RESPONSE (200)</H3>
      <Pre>{`{"token":"eyJhbGciOiJIUzI1NiIs..."}`}</Pre>
      <H3>COOKIE</H3>
      <P>Sets <code>mooser_token</code> -- httpOnly, secure, sameSite=lax, path=/, 24-hour expiry. Browser requests include it automatically.</P>
      <H3>ERRORS</H3>
      <Table rows={[["401", "Invalid email or password"]]} />

      <Hr />
      <Endpoint method="POST" path="/api/auth/logout" />
      <P>Clears the session cookie. No request body needed.</P>
      <H3>RESPONSE (200)</H3>
      <Pre>{`{"ok":true}`}</Pre>

      <Hr />
      <Endpoint method="GET" path="/api/auth/token" />
      <P>Returns the current JWT from the session cookie. Use this from client-side code when you need a Bearer token for API calls.</P>
      <H3>RESPONSE (200)</H3>
      <Pre>{`{"token":"eyJhbGciOiJIUzI1NiIs..."}`}</Pre>
      <P>Returns 401 if there is no valid session cookie.</P>

      <Hr />
      <H2>TOKEN FORMAT</H2>
      <P>The JWT payload:</P>
      <Pre>{`{
  "userId": "uuid-here",
  "email": "user@example.com",
  "iat": 1711152000,
  "exp": 1711756800
}`}</Pre>
      <P>Signed with HS256. The secret is server-side only. Tokens cannot be forged without the <code>JWT_SECRET</code> env var.</P>

      <H2>USING THE TOKEN</H2>
      <Pre>{`# In API requests
curl https://api.mooser.email/templates \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Get token from session (browser/client-side)
const res = await fetch("/api/auth/token");
const { token } = await res.json();`}</Pre>

      <Hr />
      <H2>PERSISTENT API KEYS</H2>
      <P>For integrations, use persistent API keys instead of JWTs. They start with <code>mk_</code> and work everywhere JWTs work.</P>

      <Endpoint method="GET" path="/api/api-keys" />
      <P>List your API keys. Shows prefix, name, expiry, last-used time -- never the full key.</P>

      <Endpoint method="POST" path="/api/api-keys" />
      <P>Create a new API key.</P>
      <H3>REQUEST</H3>
      <Pre>{`{
  "name": "production",
  "expires_in": "never"    // "never", "7d", "30d", "90d", "180d", "1y"
}`}</Pre>
      <H3>RESPONSE (201)</H3>
      <Pre>{`{
  "key": "mk_a1b2c3d4...",    // shown ONCE -- copy it now
  "prefix": "mk_a1b2...d4e5",
  "name": "production",
  "expires_at": null
}`}</Pre>
      <P>The full key is never stored. It&apos;s hashed with SHA-256 before saving. If you lose it, revoke and create a new one.</P>

      <Endpoint method="DELETE" path="/api/api-keys/:id" />
      <P>Revoke a key. It stops working immediately.</P>

      <H3>USING API KEYS</H3>
      <Pre>{`# Works exactly like a JWT
curl https://api.mooser.email/templates \\
  -H "Authorization: Bearer mk_a1b2c3d4..."

# In MCP config
"headers": { "Authorization": "Bearer mk_a1b2c3d4..." }`}</Pre>
    </div>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  const colors: Record<string, string> = { GET: "#3b82f6", POST: "#ef4444", PUT: "#f59e0b", DELETE: "#e11d48", PATCH: "#f59e0b" };
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
  return <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: ".85rem", letterSpacing: ".12em", color: "var(--grey)", marginBottom: ".5rem", marginTop: "1rem" }}>{children}</h3>;
}
function Hr() {
  return <hr style={{ border: "none", borderTop: "1px solid var(--mid)", margin: "2rem 0" }} />;
}
function Table({ rows }: { rows: string[][] }) {
  return (
    <table style={{ width: "100%", fontSize: ".82rem", borderCollapse: "collapse", marginBottom: ".75rem" }}>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]}>
            <td style={{ padding: ".4rem .6rem", borderBottom: "1px solid var(--mid)", color: "var(--fg)", fontFamily: "monospace", width: "30%" }}>{r[0]}</td>
            <td style={{ padding: ".4rem .6rem", borderBottom: "1px solid var(--mid)", color: "var(--grey)" }}>{r[1]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
