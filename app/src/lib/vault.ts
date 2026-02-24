import { createClient } from "@supabase/supabase-js";

export async function getUserResendKey(
  userId: string
): Promise<{ apiKey: string; fromAddress: string } | null> {
  const serviceClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: keyRow } = await serviceClient
    .from("resend_keys")
    .select("vault_secret_id, from_address")
    .eq("user_id", userId)
    .single();

  if (!keyRow) return null;

  const { data: vaultRow } = await serviceClient
    .schema("vault")
    .from("decrypted_secrets")
    .select("decrypted_secret")
    .eq("id", keyRow.vault_secret_id)
    .single();

  if (!vaultRow?.decrypted_secret) return null;

  return {
    apiKey:      vaultRow.decrypted_secret as string,
    fromAddress: keyRow.from_address as string,
  };
}
