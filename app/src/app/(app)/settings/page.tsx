"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

interface KeyInfo {
  hint: string;
  from_address: string;
}

export default function SettingsPage() {
  const [apiKey, setApiKey]       = useState("");
  const [fromAddr, setFromAddr]   = useState("");
  const [keyInfo, setKeyInfo]     = useState<KeyInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("resend_keys")
        .select("key_hint, from_address")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setKeyInfo({ hint: data.key_hint as string, from_address: data.from_address as string });
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not signed in"); setSaving(false); return; }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    const res = await fetch(`${supabaseUrl}/functions/v1/store-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ api_key: apiKey.trim(), from_address: fromAddr.trim() }),
    });

    setSaving(false);
    const body = await res.json() as { hint?: string; from_address?: string; error?: string };

    if (!res.ok) {
      setError(body.error ?? "Failed to save key");
      return;
    }

    setKeyInfo({ hint: body.hint!, from_address: body.from_address! });
    setApiKey("");
    setFromAddr("");
    setSuccess("Key saved. You're good to go.");
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <span className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <h1>SETTINGS</h1>

      {/* ── Resend API Key ──────────────────────────── */}
      <div className="settings-section">
        <h2>RESEND API KEY</h2>

        <p style={{ fontSize: ".8rem", color: "var(--grey)", letterSpacing: ".08em", marginBottom: "1.5rem" }}>
          Your key is stored securely and never exposed. Only needs Send + Receive Email permissions on your Resend account.
        </p>

        {keyInfo && (
          <div className="key-display" style={{ marginBottom: "1.5rem" }}>
            <div>
              <div style={{ fontSize: ".65rem", letterSpacing: ".2em", color: "var(--grey)", marginBottom: ".25rem" }}>CURRENT KEY</div>
              <div>{keyInfo.hint}</div>
            </div>
            <div>
              <div style={{ fontSize: ".65rem", letterSpacing: ".2em", color: "var(--grey)", marginBottom: ".25rem" }}>FROM ADDRESS</div>
              <div>{keyInfo.from_address}</div>
            </div>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSaveKey}>
          <div className="field">
            <label className="label">{keyInfo ? "Replace API Key" : "API Key"}</label>
            <input
              className="input"
              type="password"
              placeholder="re_••••••••••••••••••••••••"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label className="label">From Address</label>
            <input
              className="input"
              type="email"
              placeholder="hello@yourdomain.com"
              value={fromAddr}
              onChange={e => setFromAddr(e.target.value)}
              required
            />
          </div>
          <button className="btn" disabled={saving}>
            {saving ? <><span className="spinner" /> SAVING...</> : keyInfo ? "UPDATE KEY" : "SAVE KEY"}
          </button>
        </form>
      </div>
    </div>
  );
}
