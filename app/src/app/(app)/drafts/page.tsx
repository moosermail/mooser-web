"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Draft {
  to: string;
  subject: string;
  body: string;
  cc: string;
  savedAt: string;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("moosermail_drafts");
      if (raw) setDrafts(JSON.parse(raw) as Record<string, Draft>);
    } catch {}
  }, []);

  function deleteDraft(key: string) {
    const updated = { ...drafts };
    delete updated[key];
    setDrafts(updated);
    localStorage.setItem("moosermail_drafts", JSON.stringify(updated));
  }

  const entries = Object.entries(drafts).sort(
    ([, a], [, b]) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <h2>NO DRAFTS</h2>
        <p>Drafts you save while composing will appear here.</p>
        <Link href="/compose" className="btn" style={{ marginTop: "1rem" }}>COMPOSE</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <span className="toolbar-title">DRAFTS</span>
        <span className="badge" style={{ marginLeft: "auto" }}>{entries.length}</span>
      </div>
      <ul className="email-list">
        {entries.map(([key, draft]) => (
          <li key={key} style={{ position: "relative" }}>
            <Link
              href={`/compose?to=${encodeURIComponent(draft.to)}&subject=${encodeURIComponent(draft.subject)}`}
              className="email-item"
            >
              <div className="email-meta">
                <span className="email-from">To: {draft.to || "(no recipient)"}</span>
                <span className="email-date">{new Date(draft.savedAt).toLocaleDateString()}</span>
              </div>
              <span className="email-subject">{draft.subject || "(no subject)"}</span>
              {draft.body && <span className="email-preview">{draft.body.slice(0, 100)}</span>}
            </Link>
            <button
              onClick={() => deleteDraft(key)}
              className="btn btn-ghost btn-sm"
              style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)" }}
            >
              DELETE
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
