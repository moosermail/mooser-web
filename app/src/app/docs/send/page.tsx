export const metadata = {
  title: "Send API | Moosermail Docs",
  description: "Send emails directly via the Moosermail API. Plain text, HTML, attachments, multiple recipients.",
};

export default function SendApiPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", marginBottom: ".5rem" }}>SEND API</h1>
      <p style={{ color: "var(--grey)", fontSize: ".9rem", lineHeight: 1.8, marginBottom: "2rem" }}>
        Send emails directly via the API. Supports plain text, HTML, file attachments, and multiple recipients.
        Sends through your stored Resend API key and from address.
      </p>

      <Endpoint method="POST" path="/api/send" />
      <P>Requires Bearer auth.</P>

      <H3>REQUEST BODY</H3>
      <Pre>{`{
  "to": "jane@example.com",              // string or string[] for multiple
  "subject": "Invoice #1234",
  "body": "Hi Jane, your invoice is attached.",
  "html": "<h1>Invoice</h1><p>...</p>",  // optional -- HTML version
  "cc": "accounting@company.com",        // optional
  "attachments": [                       // optional
    {
      "filename": "invoice.pdf",
      "content": "base64-encoded-content-here"
    }
  ]
}`}</Pre>

      <H3>FIELDS</H3>
      <table style={{ width: "100%", fontSize: ".8rem", borderCollapse: "collapse", marginBottom: ".75rem" }}>
        <thead>
          <tr>
            <th style={{ padding: ".4rem .5rem", borderBottom: "1px solid var(--mid)", color: "var(--grey)", textAlign: "left", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: ".08em", fontWeight: 400 }}>FIELD</th>
            <th style={{ padding: ".4rem .5rem", borderBottom: "1px solid var(--mid)", color: "var(--grey)", textAlign: "left", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: ".08em", fontWeight: 400 }}>TYPE</th>
            <th style={{ padding: ".4rem .5rem", borderBottom: "1px solid var(--mid)", color: "var(--grey)", textAlign: "left", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: ".08em", fontWeight: 400 }}>NOTES</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["to *", "string | string[]", "Recipient(s). Array sends one email with all addresses in To."],
            ["subject *", "string", "Email subject line."],
            ["body *", "string", "Plain text body. Always required even when sending HTML."],
            ["html", "string", "HTML body. Email clients show this instead of plain text when provided."],
            ["cc", "string", "CC recipient."],
            ["attachments", "array", "Each item has filename (string) and content (base64 string). Max 10 MB per file."],
          ].map(([field, type, notes]) => (
            <tr key={field}>
              <td style={{ padding: ".4rem .5rem", borderBottom: "1px solid var(--mid)", color: "var(--fg)", fontFamily: "monospace" }}>{field}</td>
              <td style={{ padding: ".4rem .5rem", borderBottom: "1px solid var(--mid)", color: "var(--grey)", fontFamily: "monospace" }}>{type}</td>
              <td style={{ padding: ".4rem .5rem", borderBottom: "1px solid var(--mid)", color: "var(--grey)" }}>{notes}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H3>RESPONSE (200)</H3>
      <Pre>{`{"id":"resend-email-id-here"}`}</Pre>

      <H3>EXAMPLES</H3>
      <Pre>{`# Simple text email
curl -X POST https://api.mooser.email/send \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"to":"bob@example.com","subject":"Hey","body":"Quick note."}'

# HTML email to multiple recipients with attachment
curl -X POST https://api.mooser.email/send \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "to": ["alice@co.com", "bob@co.com"],
    "subject": "Q4 Report",
    "body": "Report attached.",
    "html": "<h1>Q4 Report</h1><p>See attached PDF.</p>",
    "attachments": [{"filename":"q4.pdf","content":"JVBERi0xLjQ..."}]
  }'`}</Pre>

      <H3>ERRORS</H3>
      <table style={{ width: "100%", fontSize: ".82rem", borderCollapse: "collapse", marginBottom: ".75rem" }}>
        <tbody>
          {[
            ["401", "Missing or invalid Bearer token"],
            ["403", "No Resend API key configured -- add one in Settings"],
            ["400", "Missing required fields (to, subject, body)"],
            ["500", "Send failed (Resend API error -- check the response body for detail)"],
          ].map(([code, desc]) => (
            <tr key={code}>
              <td style={{ padding: ".4rem .6rem", borderBottom: "1px solid var(--mid)", color: "var(--fg)", fontFamily: "monospace", width: "10%" }}>{code}</td>
              <td style={{ padding: ".4rem .6rem", borderBottom: "1px solid var(--mid)", color: "var(--grey)" }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H3>EMAIL SIGNATURE</H3>
      <P>
        If the Moosermail signature is enabled in Settings, a footer is appended:{" "}
        <em>Sent with Moosermail (mooser.email)</em>. Disable it in Settings &gt; Email Signature.
      </P>
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
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: ".85rem", letterSpacing: ".12em", color: "var(--grey)", marginBottom: ".5rem", marginTop: "1.25rem" }}>{children}</h3>;
}
