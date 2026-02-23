import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase";
import { getUserResendKey } from "@/lib/vault";
import { resendFetch } from "@/lib/resend";

interface SentEmail {
  id: string;
  to: string[];
  subject: string;
  created_at: string;
}

export default async function SentPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const creds = await getUserResendKey(user.id);
  if (!creds) {
    return (
      <div className="empty-state">
        <h2>NO KEY CONNECTED</h2>
        <p>Add your Resend API key in Settings first.</p>
        <Link href="/settings" className="btn" style={{ marginTop: "1rem" }}>GO TO SETTINGS</Link>
      </div>
    );
  }

  let emails: SentEmail[] = [];
  try {
    const data = await resendFetch(creds.apiKey, "GET", "/emails?limit=50") as { data?: SentEmail[] };
    emails = data.data ?? [];
  } catch (err) {
    return (
      <div className="empty-state">
        <h2>COULD NOT LOAD</h2>
        <p>{(err as Error).message}</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="empty-state">
        <h2>NOTHING SENT YET</h2>
        <p>Sent emails will appear here.</p>
        <Link href="/compose" className="btn" style={{ marginTop: "1rem" }}>COMPOSE</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <span className="toolbar-title">SENT</span>
        <span className="badge" style={{ marginLeft: "auto" }}>{emails.length}</span>
      </div>
      <ul className="email-list">
        {emails.map(email => (
          <li key={email.id}>
            <div className="email-item" style={{ cursor: "default" }}>
              <div className="email-meta">
                <span className="email-from">To: {(email.to ?? []).join(", ")}</span>
                <span className="email-date">{new Date(email.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
              </div>
              <span className="email-subject">{email.subject || "(no subject)"}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
