"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase";

interface Draft {
  to: string;
  subject: string;
  body: string;
  cc: string;
  savedAt: string;
}

export default function ComposePage() {
  const params = useSearchParams();
  const [to, setTo]           = useState(params.get("to") ?? "");
  const [subject, setSubject] = useState(params.get("subject") ?? "");
  const [body, setBody]       = useState("");
  const [cc, setCc]           = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const [saved, setSaved]     = useState(false);
  const draftKey              = useRef(`draft_${Date.now()}`);

  // Auto-save draft
  useEffect(() => {
    if (!to && !subject && !body) return;
    const draft: Draft = { to, subject, body, cc, savedAt: new Date().toISOString() };
    const drafts = getDrafts();
    drafts[draftKey.current] = draft;
    localStorage.setItem("moosermail_drafts", JSON.stringify(drafts));
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [to, subject, body, cc]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);

    const supabase = createSupabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not signed in"); setSending(false); return; }

    const res = await fetch("/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ to, subject, body, cc }),
    });

    setSending(false);

    if (!res.ok) {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "Failed to send");
      return;
    }

    // Remove draft on send
    const drafts = getDrafts();
    delete drafts[draftKey.current];
    localStorage.setItem("moosermail_drafts", JSON.stringify(drafts));

    setSent(true);
  }

  if (sent) {
    return (
      <div className="compose-page">
        <div className="empty-state">
          <h2>EMAIL SENT</h2>
          <p>Your message was delivered via Resend.</p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <Link href="/inbox" className="btn">BACK TO INBOX</Link>
            <button className="btn btn-ghost" onClick={() => { setSent(false); setTo(""); setSubject(""); setBody(""); setCc(""); }}>
              COMPOSE ANOTHER
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="compose-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <h1 className="heading" style={{ fontSize: "2.5rem" }}>COMPOSE</h1>
        {saved && <span style={{ fontSize: ".7rem", color: "var(--grey)", letterSpacing: ".15em" }}>DRAFT SAVED</span>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSend}>
        <div className="field">
          <label className="label">To</label>
          <input className="input" type="email" placeholder="recipient@example.com" value={to} onChange={e => setTo(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label">CC (optional)</label>
          <input className="input" type="email" placeholder="cc@example.com" value={cc} onChange={e => setCc(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Subject</label>
          <input className="input" type="text" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label">Body</label>
          <textarea className="input" placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} required rows={10} />
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button className="btn" disabled={sending}>
            {sending ? <><span className="spinner" /> SENDING...</> : "SEND EMAIL"}
          </button>
          <Link href="/inbox" className="btn btn-ghost">CANCEL</Link>
        </div>
      </form>
    </div>
  );
}

function getDrafts(): Record<string, Draft> {
  try {
    return JSON.parse(localStorage.getItem("moosermail_drafts") ?? "{}") as Record<string, Draft>;
  } catch {
    return {};
  }
}
