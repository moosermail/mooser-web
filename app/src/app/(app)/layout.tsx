import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import AppNav from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user.id)
    .single();

  return (
    <>
      <AppNav plan={profile?.plan} />
      <div className="app-body">{children}</div>
    </>
  );
}
