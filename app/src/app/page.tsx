import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase";

export default async function RootPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/inbox");
  else redirect("/login");
}
