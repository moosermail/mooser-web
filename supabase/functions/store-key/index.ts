// Moosermail — store-key edge function
// BYOK: receives { api_key, from_address }, validates the key,
// stores it in Supabase Vault, and records the hint + from_address.
// Raw key never leaves this function.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── 1. Auth: require valid Supabase JWT ───────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing Authorization header" }, 401);
    }
    const token = authHeader.slice(7).trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the JWT by creating a user-scoped client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: "Invalid or expired token" }, 401);
    }
    const userId = user.id;

    // ── 2. Parse body ─────────────────────────────────────────
    const body = await req.json() as { api_key?: string; from_address?: string };
    const { api_key, from_address } = body;

    if (!api_key || typeof api_key !== "string" || !api_key.startsWith("re_")) {
      return json({ error: "api_key must be a valid Resend API key (starts with re_)" }, 400);
    }
    if (!from_address || typeof from_address !== "string" || !from_address.includes("@")) {
      return json({ error: "from_address must be a valid email address" }, 400);
    }

    // ── 3. Validate key against Resend API ────────────────────
    const testRes = await fetch("https://api.resend.com/emails/receiving?limit=1", {
      headers: { Authorization: `Bearer ${api_key}` },
    });
    if (!testRes.ok && testRes.status !== 404) {
      // 404 = no emails yet, which is fine. Any other error = bad key.
      return json({ error: "Resend API key validation failed. Check the key and try again." }, 400);
    }

    // ── 4. Build key hint ─────────────────────────────────────
    // Show first 3 chars and last 4 chars: re_****abcd
    const hint = `${api_key.slice(0, 3)}_****${api_key.slice(-4)}`;

    // ── 5. Store in Vault via service role ────────────────────
    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Check if user already has a key stored — if so, delete the old vault secret first
    const { data: existingRow } = await serviceClient
      .from("resend_keys")
      .select("vault_secret_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingRow?.vault_secret_id) {
      // Remove old vault secret
      await serviceClient.rpc("vault_delete_secret", {
        secret_id: existingRow.vault_secret_id,
      }).maybeSingle();
    }

    // Create new vault secret
    const { data: vaultData, error: vaultError } = await serviceClient
      .rpc("vault_upsert_secret", {
        new_secret: api_key,
        new_name: userId,
        new_description: `Resend API key for user ${userId}`,
      })
      .single() as { data: string | null; error: unknown };

    if (vaultError || !vaultData) {
      console.error("Vault error:", vaultError);
      return json({ error: "Failed to store key securely" }, 500);
    }

    const vaultSecretId = vaultData as string;

    // ── 6. Upsert resend_keys row ─────────────────────────────
    const { error: upsertError } = await serviceClient
      .from("resend_keys")
      .upsert(
        {
          user_id:         userId,
          vault_secret_id: vaultSecretId,
          key_hint:        hint,
          from_address:    from_address.trim().toLowerCase(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return json({ error: "Failed to save key metadata" }, 500);
    }

    // ── 7. Return only safe metadata ──────────────────────────
    return json({ hint, from_address: from_address.trim().toLowerCase() }, 200);
  } catch (err) {
    console.error("store-key error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
