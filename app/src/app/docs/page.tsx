import Link from "next/link";

export const metadata = {
  title: "API Docs | Moosermail",
  description: "Moosermail API documentation: triggers, templates, cron jobs, pipes, MCP server, auth, and more.",
};

const CARDS = [
  { href: "/docs/quickstart", title: "QUICKSTART", desc: "Go from zero to sending in 5 minutes. Signup, API key, template, trigger, done." },
  { href: "/docs/auth",       title: "AUTH",       desc: "Login, signup, logout, and token endpoints. JWT-based, cookie and Bearer support." },
  { href: "/docs/send",       title: "SEND API",   desc: "Send emails directly. Plain text, HTML, attachments, multiple recipients." },
  { href: "/docs/templates",  title: "TEMPLATES",  desc: "Create reusable email templates with {{variable}} placeholders." },
  { href: "/docs/triggers",   title: "TRIGGERS",   desc: "API keys that fire template emails. No auth needed -- the key is the auth." },
  { href: "/docs/cron",       title: "CRON",       desc: "Schedule recurring email sends. Pick a template, set a cron expression, done." },
  { href: "/docs/pipes",      title: "PIPES",      desc: "Auto-process incoming emails. Webhook, forward, auto-reply, tag, or hide." },
  { href: "/docs/mcp",        title: "MCP",        desc: "Connect AI agents to your inbox via the Model Context Protocol. 12 tools." },
  { href: "/docs/send-log",   title: "SEND LOG",   desc: "View history of all triggered, scheduled, and piped sends." },
];

export default function DocsIndex() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.5rem", letterSpacing: ".04em", marginBottom: ".5rem" }}>
        API DOCUMENTATION
      </h1>
      <p style={{ color: "var(--grey)", fontSize: ".9rem", lineHeight: 1.7, marginBottom: "2rem" }}>
        Everything you need to integrate with Moosermail. Base URL:{" "}
        <code style={{ background: "var(--mid)", padding: ".15rem .4rem", borderRadius: 4 }}>https://api.mooser.email</code>.
        Authenticated endpoints require{" "}
        <code style={{ background: "var(--mid)", padding: ".15rem .4rem", borderRadius: 4 }}>Authorization: Bearer YOUR_TOKEN</code>.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
        {CARDS.map(c => (
          <Link key={c.href} href={c.href} style={{
            display: "block", padding: "1.25rem", borderRadius: 12, background: "var(--card)",
            border: "1px solid var(--mid)", textDecoration: "none", transition: "border-color .15s",
          }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: ".08em", color: "var(--fg)", marginBottom: ".4rem" }}>
              {c.title}
            </div>
            <div style={{ fontSize: ".78rem", color: "var(--grey)", lineHeight: 1.6 }}>{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
