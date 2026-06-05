import Link from "next/link";
import DocsSidebar from "@/components/DocsSidebar";

export const metadata = {
  title: "API Docs | Moosermail",
  description: "Moosermail API documentation. Triggers, templates, cron jobs, pipes, MCP, and more.",
};

export default function PublicDocsLayout({ children }: { children: React.ReactNode }) {
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
            DOCS
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <Link href="https://github.com/moosermail/mooser-web" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: ".78rem", color: "var(--grey)", textDecoration: "none", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: ".08em" }}>
            GITHUB
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
      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        <DocsSidebar />
        <main style={{ flex: 1, padding: "2rem 2.5rem", maxWidth: 800, overflow: "auto" }}>
          {children}
        </main>
      </div>
    </>
  );
}
