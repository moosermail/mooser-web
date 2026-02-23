// Moosermail — stripe-webhook edge function
// Handles Stripe billing lifecycle events and updates user profiles.
// Uses Stripe webhook signature verification for security.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
  const serviceKey     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeSecret   = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret  = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const priceBasic     = Deno.env.get("PRICE_BASIC")!;   // e.g. price_xxx
  const pricePro       = Deno.env.get("PRICE_PRO")!;     // e.g. price_yyy

  const stripe = new Stripe(stripeSecret, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ── 1. Read raw body for signature verification ───────────
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // ── 2. Idempotency guard ──────────────────────────────────
  const { error: idempotencyError } = await supabase
    .from("webhook_events")
    .insert({ id: event.id, type: event.type });

  if (idempotencyError) {
    // Duplicate event — return 200 without processing
    if (idempotencyError.code === "23505") {
      console.log(`Duplicate event ${event.id}, skipping`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Idempotency check error:", idempotencyError);
  }

  // ── 3. Map price ID → plan name ───────────────────────────
  function priceToplan(priceId: string): string {
    if (priceId === pricePro)   return "pro";
    if (priceId === priceBasic) return "basic";
    return "basic"; // safe default
  }

  // ── 4. Handle Stripe events ───────────────────────────────
  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const priceId    = sub.items.data[0]?.price.id ?? "";
        const plan       = priceToplan(priceId);
        const status     = sub.status === "active" ? "active"
                         : sub.status === "past_due" ? "past_due"
                         : sub.status === "canceled" ? "canceled"
                         : "inactive";

        await supabase
          .from("profiles")
          .update({
            plan,
            stripe_subscription_id: sub.id,
            subscription_status:    status,
          })
          .eq("stripe_customer_id", customerId);

        console.log(`Updated profile for customer ${customerId}: plan=${plan}, status=${status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await supabase
          .from("profiles")
          .update({
            plan:                   "basic",
            stripe_subscription_id: null,
            subscription_status:    "canceled",
          })
          .eq("stripe_customer_id", customerId);

        console.log(`Subscription canceled for customer ${customerId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabase
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);

        console.log(`Payment failed for customer ${customerId}`);
        break;
      }

      case "checkout.session.completed": {
        // On first checkout, link Stripe customer ID to the profile
        const session    = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const userId     = session.metadata?.user_id;

        if (userId && customerId) {
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);

          console.log(`Linked customer ${customerId} to user ${userId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Error processing event:", err);
    return new Response("Processing error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
