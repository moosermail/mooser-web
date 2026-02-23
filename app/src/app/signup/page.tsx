"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const supabase = createSupabaseBrowser();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/inbox` },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">CHECK YOUR EMAIL</h1>
          <p className="auth-sub">Confirmation link sent to {email}</p>
          <p style={{ fontSize: ".8rem", color: "var(--grey)", textAlign: "center", lineHeight: 1.7 }}>
            Click the confirmation link to activate your account, then sign in.
          </p>
          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <Link className="btn btn-ghost btn-sm" href="/login">Back to sign in</Link>
          </div>
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

        <h1 className="auth-title">CREATE ACCOUNT</h1>
        <p className="auth-sub">Start with Basic — $3.99/mo</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSignup}>
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
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button className="btn" style={{ width: "100%" }} disabled={loading}>
            {loading ? <span className="spinner" /> : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{" "}
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
