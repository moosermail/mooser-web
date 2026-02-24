import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import BillingClient from "./BillingClient";

export default async function BillingPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, stripe_customer_id")
    .eq("id", user.id)
    .single();

  return (
    <div className="billing-page">
      <h1>BILLING</h1>

      <BillingClient
        plan={profile?.plan ?? "basic"}
        status={profile?.subscription_status ?? "inactive"}
        hasCustomer={!!profile?.stripe_customer_id}
      />
    </div>
  );
}
