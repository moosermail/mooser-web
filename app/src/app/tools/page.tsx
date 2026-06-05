import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Email Tools for Developers | Moosermail",
  description: "Free tools for email senders: deliverability checker, SPF/DKIM/DMARC lookup, email header analyzer, bounce handling guide, and transactional email setup.",
};

const tools = [
  {
    href: "/tools/email-deliverability",
    title: "Email Deliverability Checker",
    desc: "Why emails land in spam and how to fix it. Check your setup against the signals that Gmail and Outlook actually weight.",
  },
  {
    href: "/tools/spf-dkim-dmarc",
    title: "SPF, DKIM, and DMARC Guide",
    desc: "Set up authentication records correctly the first time. Copy-paste DNS values for Resend, SendGrid, Postmark, and others.",
  },
  {
    href: "/tools/email-header-analyzer",
    title: "Email Header Analyzer",
    desc: "Read raw email headers. Find delivery delays, authentication failures, and routing hops in plain language.",
  },
  {
    href: "/tools/transactional-email",
    title: "Transactional Email Best Practices",
    desc: "What separates a 99.9% delivery rate from a 70% one. Covers sending infrastructure, domain reputation, and list hygiene.",
  },
  {
    href: "/tools/email-bounce-handler",
    title: "Email Bounce Handler Guide",
    desc: "Hard bounces, soft bounces, complaints. How to handle each one via webhook, what to suppress, and how to recover your sender score.",
  },
  {
    href: "/tools/resend-webhook-tester",
    title: "Resend Webhook Tester",
    desc: "How to test Resend inbound webhooks locally and in production. Includes ngrok setup, payload examples, and verification code.",
  },
];

export default function ToolsIndex() {
  return (
    <>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", letterSpacing: ".1em", marginBottom: ".5rem" }}>
        EMAIL TOOLS
      </h1>
      <p style={{ color: "var(--grey)", marginBottom: "2.5rem", lineHeight: 1.6 }}>
        Free resources for developers and senders. No sign-up required.
      </p>

      <div style={{ borderTop: "1px solid var(--mid)" }}>
        {tools.map((t) => (
          <Link key={t.href} href={t.href} style={{ textDecoration: "none", display: "block" }}>
            <div style={{ padding: "1.25rem 0", borderBottom: "1px solid var(--mid)" }}>
              <div style={{ fontWeight: 600, marginBottom: ".3rem", color: "var(--fg)" }}>{t.title}</div>
              <div style={{ fontSize: ".88rem", color: "var(--grey)", lineHeight: 1.55 }}>{t.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
