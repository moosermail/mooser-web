"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState<"password" | "magic">("password");

  const supabase = createSupabaseBrowser();

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.push("/inbox");
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/inbox` },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <span>MOOSERMAIL</span>
          </div>
          <h1 className="auth-title">CHECK YOUR EMAIL</h1>
          <p className="auth-sub">Magic link sent to {email}</p>
          <p style={{ fontSize: ".8rem", color: "var(--grey)", textAlign: "center", lineHeight: 1.7 }}>
            Click the link in the email to sign in. No password needed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <a className="auth-logo" href="https://mooser.email">
          <span>MOOSERMAIL</span>
        </a>

        <h1 className="auth-title">SIGN IN</h1>
        <p className="auth-sub">Welcome back</p>

        {error && <div className="alert alert-error">{error}</div>}

        {mode === "password" ? (
          <form onSubmit={handlePasswordLogin}>
            <div className="field">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button className="btn" style={{ width: "100%" }} disabled={loading}>
              {loading ? <span className="spinner" /> : "SIGN IN"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMagicLink}>
            <div className="field">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <button className="btn" style={{ width: "100%" }} disabled={loading}>
              {loading ? <span className="spinner" /> : "SEND MAGIC LINK"}
            </button>
          </form>
        )}

        <div className="auth-divider">OR</div>

        <button
          className="btn btn-outline"
          style={{ width: "100%" }}
          onClick={() => { setMode(mode === "password" ? "magic" : "password"); setError(""); }}
        >
          {mode === "password" ? "USE MAGIC LINK" : "USE PASSWORD"}
        </button>

        <div className="auth-footer">
          No account?{" "}
          <Link href="/signup">Create one</Link>
        </div>
      </div>
    </div>
  );
}
