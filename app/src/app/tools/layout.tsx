import Link from "next/link";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header style={{
        height: 56, borderBottom: "1px solid var(--mid)", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        padding: "0 1.5rem", position: "sticky", top: 0, zIndex: 10,
        background: "var(--bg)",
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: ".5rem" }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.25rem", letterSpacing: ".12em", color: "var(--fg)" }}>
            MOOSERMAIL
          </span>
          <span style={{ fontSize: ".7rem", color: "var(--grey)", letterSpacing: ".06em", fontFamily: "'Bebas Neue', sans-serif" }}>
            TOOLS
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <Link href="/docs" style={{ fontSize: ".78rem", color: "var(--grey)", textDecoration: "none", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: ".08em" }}>
            DOCS
          </Link>
          <Link href="/login" style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: ".78rem", letterSpacing: ".1em",
            padding: ".35rem .85rem", borderRadius: 6, background: "var(--accent)",
            color: "var(--accent-text)", textDecoration: "none",
          }}>
            SIGN IN
          </Link>
        </div>
      </header>
      <main style={{ maxWidth: 780, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>
        {children}
      </main>
    </>
  );
}
