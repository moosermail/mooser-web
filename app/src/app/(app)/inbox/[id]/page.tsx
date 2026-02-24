import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getUserResendKey } from "@/lib/vault";
import { resendFetch } from "@/lib/resend";

interface EmailDetail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  created_at: string;
}

export default async function EmailPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const creds = await getUserResendKey(user.id);
  if (!creds) redirect("/settings");

  let email: EmailDetail;
  try {
    email = await resendFetch(creds.apiKey, "GET", `/emails/receiving/${params.id}`) as unknown as EmailDetail;
  } catch {
    notFound();
  }

  const body = email.text || stripHtml(email.html || "") || "(no body)";
  const replyTo = extractEmail(email.from);

  return (
    <div className="inbox-content">
      <div className="email-view">
        <div className="email-view-header">
          <Link href="/inbox" className="btn btn-ghost btn-sm" style={{ marginBottom: "1rem" }}>
            ← BACK
          </Link>
          <h1 className="email-view-subject">{email.subject || "(no subject)"}</h1>
          <div className="email-view-meta">
            <div><strong>FROM:</strong> {email.from}</div>
            <div><strong>TO:</strong> {(email.to ?? []).join(", ")}</div>
            <div><strong>DATE:</strong> {new Date(email.created_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="email-view-body">{body}</div>

        <div className="email-view-actions">
          <Link
            href={`/compose?to=${encodeURIComponent(replyTo)}&subject=${encodeURIComponent("Re: " + email.subject)}`}
            className="btn"
          >
            REPLY
          </Link>
          <Link href="/inbox" className="btn btn-ghost">BACK TO INBOX</Link>
        </div>
      </div>
    </div>
  );
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/);
  return match ? match[1] : from;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
