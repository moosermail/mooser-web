import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserResendKey } from "@/lib/vault";
import { resendFetch } from "@/lib/resend";

const serviceClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.slice(7).trim();

  const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
  });
  if (!userRes.ok) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const user = await userRes.json() as { id: string };

  // Check active subscription (Basic or Pro can send)
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.subscription_status !== "active") {
    return NextResponse.json({ error: "Active subscription required to send emails" }, { status: 403 });
  }

  const creds = await getUserResendKey(user.id);
  if (!creds) {
    return NextResponse.json({ error: "No Resend API key configured. Add one in Settings." }, { status: 403 });
  }

  const body = await req.json() as { to?: string; subject?: string; body?: string; cc?: string };
  if (!body.to || !body.subject || !body.body) {
    return NextResponse.json({ error: "Missing required fields: to, subject, body" }, { status: 400 });
  }

  try {
    const payload: Record<string, unknown> = {
      from:    creds.fromAddress,
      to:      [body.to],
      subject: body.subject,
      text:    body.body,
    };
    if (body.cc) payload.cc = [body.cc];

    const result = await resendFetch(creds.apiKey, "POST", "/emails", payload) as { id?: string };
    return NextResponse.json({ id: result.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
