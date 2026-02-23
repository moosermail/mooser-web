"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

const NAV_LINKS = [
  { href: "/inbox",   label: "INBOX"    },
  { href: "/compose", label: "COMPOSE"  },
  { href: "/drafts",  label: "DRAFTS"   },
  { href: "/sent",    label: "SENT"     },
  { href: "/settings",label: "SETTINGS" },
  { href: "/billing", label: "BILLING"  },
];

export default function AppNav({ plan }: { plan?: string }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createSupabaseBrowser();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <nav className="app-nav">
      <Link className="app-brand" href="/inbox">
        MOOSERMAIL
      </Link>

      {plan === "pro" && (
        <span className="badge badge-pro" style={{ fontSize: ".6rem" }}>PRO</span>
      )}

      <div className="app-nav-links">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link${pathname.startsWith(href) ? " active" : ""}`}
          >
            {label}
          </Link>
        ))}
        <button className="nav-link" onClick={signOut} style={{ background: "none", border: "none", cursor: "pointer" }}>
          SIGN OUT
        </button>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
      </div>
    </nav>
  );
}
