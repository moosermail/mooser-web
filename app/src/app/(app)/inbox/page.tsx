import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getUserResendKey } from "@/lib/vault";
import { resendFetch } from "@/lib/resend";

interface Email {
  id: string;
  from: string;
  subject: string;
  created_at: string;
  text?: string;
}

export default async function InboxPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const creds = await getUserResendKey(user.id);

  if (!creds) {
    return (
      <div className="empty-state">
        <h2>NO KEY CONNECTED</h2>
        <p>Add your Resend API key in Settings to view your inbox</p>
        <Link href="/settings" className="btn" style={{ marginTop: "1rem" }}>
          GO TO SETTINGS
        </Link>
      </div>
    );
  }

  let emails: Email[] = [];
  let fetchError = "";

  try {
    const data = await resendFetch(creds.apiKey, "GET", "/emails/receiving?limit=50") as { data?: Email[] };
    emails = data.data ?? [];
  } catch (err) {
    fetchError = (err as Error).message;
  }

  if (fetchError) {
    return (
      <div className="empty-state">
        <h2>COULD NOT LOAD</h2>
        <p>{fetchError}</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="empty-state">
        <h2>INBOX ZERO</h2>
        <p>No emails yet. New messages will appear here.</p>
        <Link href="/compose" className="btn" style={{ marginTop: "1rem" }}>COMPOSE</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <span className="toolbar-title">INBOX</span>
        <span className="badge" style={{ marginLeft: "auto" }}>{emails.length}</span>
        <Link href="/compose" className="btn btn-sm">COMPOSE</Link>
      </div>
      <ul className="email-list">
        {emails.map(email => (
          <li key={email.id}>
            <Link href={`/inbox/${email.id}`} className="email-item">
              <div className="email-meta">
                <span className="email-from">{email.from}</span>
                <span className="email-date">{formatDate(email.created_at)}</span>
              </div>
              <span className="email-subject">{email.subject || "(no subject)"}</span>
              {email.text && (
                <span className="email-preview">{email.text.slice(0, 100)}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
