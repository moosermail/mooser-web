"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

interface Props {
  plan: string;
  status: string;
  hasCustomer: boolean;
}

export default function BillingClient({ plan, status, hasCustomer }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState("");

  const supabase = createSupabaseBrowser();

  async function checkout(tier: "basic" | "pro") {
    setError("");
    setLoading(tier);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not signed in"); setLoading(null); return; }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ tier }),
    });

    setLoading(null);

    if (!res.ok) {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "Checkout failed");
      return;
    }

    const { url } = await res.json() as { url: string };
    window.location.href = url;
  }

  async function manageSubscription() {
    setError("");
    setLoading("manage");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not signed in"); setLoading(null); return; }

    const res = await fetch("/api/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    setLoading(null);

    if (!res.ok) {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "Failed to open portal");
      return;
    }

    const { url } = await res.json() as { url: string };
    window.location.href = url;
  }

  const isActive = status === "active";
  const isPro    = plan === "pro" && isActive;
  const isBasic  = plan === "basic" && isActive;

  return (
    <>
      {/* Current plan */}
      <div className="plan-card" style={{ marginBottom: "2rem" }}>
        <div className="plan-info">
          <h3>{isPro ? "PRO PLAN" : isBasic ? "BASIC PLAN" : "NO ACTIVE PLAN"}</h3>
          <p>
            {isActive
              ? `Status: Active`
              : status === "past_due"
              ? "Status: Payment overdue"
              : status === "canceled"
              ? "Status: Canceled"
              : "No subscription"}
          </p>
        </div>
        {isActive && hasCustomer && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={manageSubscription}
            disabled={loading === "manage"}
          >
            {loading === "manage" ? <span className="spinner" /> : "MANAGE"}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Plan cards */}
      <div className="pricing-grid">
        {/* Basic */}
        <div className={`price-card${isBasic ? " current" : ""}`}>
          {isBasic && <span className="current-tag">CURRENT</span>}
          <div className="price-name">BASIC</div>
          <div className="price-amount">$3.99</div>
          <div className="price-per">per month</div>
          <ul>
            <li>Web inbox</li>
            <li>Read, reply, compose</li>
            <li>Drafts &amp; sent history</li>
            <li>CLI included free</li>
          </ul>
          {!isBasic && (
            <button
              className={`btn${isPro ? " btn-ghost" : ""} btn-sm`}
              style={{ width: "100%" }}
              onClick={() => checkout("basic")}
              disabled={!!loading}
            >
              {loading === "basic" ? <span className="spinner" /> : isPro ? "DOWNGRADE" : "SELECT BASIC"}
            </button>
          )}
        </div>

        {/* Pro */}
        <div className={`price-card${isPro ? " current" : ""}`}>
          {isPro && <span className="current-tag">CURRENT</span>}
          <div className="price-name">PRO</div>
          <div className="price-amount">$6.99</div>
          <div className="price-per">per month</div>
          <ul>
            <li>Everything in Basic</li>
            <li>MCP agent access</li>
            <li>AI reads your mail</li>
            <li>JWT-secured, no key sharing</li>
          </ul>
          {!isPro && (
            <button
              className="btn btn-sm"
              style={{ width: "100%" }}
              onClick={() => checkout("pro")}
              disabled={!!loading}
            >
              {loading === "pro" ? <span className="spinner" /> : "UPGRADE TO PRO"}
            </button>
          )}
        </div>
      </div>

      <p style={{ fontSize: ".75rem", color: "var(--grey)", letterSpacing: ".08em", marginTop: "1rem" }}>
        Cancel anytime. Billing handled securely by Stripe.
      </p>
    </>
  );
}
