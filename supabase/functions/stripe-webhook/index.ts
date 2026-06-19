import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

// Public endpoint — verify_jwt=false. Stripe signature is the only auth.

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-11-20.acacia" as any,
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Webhook signature failed", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const findUserId = async (customerId: string | null): Promise<string | null> => {
      if (!customerId) return null;
      const { data } = await admin
        .from("profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      return data?.user_id ?? null;
    };

    const syncSubscription = async (sub: Stripe.Subscription, userIdOverride?: string) => {
      const userId =
        userIdOverride ||
        (sub.metadata?.user_id as string | undefined) ||
        (await findUserId(sub.customer as string));
      if (!userId) {
        console.warn("No user_id resolved for subscription", sub.id);
        return;
      }
      const isActive = ["active", "trialing"].includes(sub.status);
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
      await admin
        .from("profiles")
        .update({
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
          current_period_end: periodEnd,
          plan_type: isActive ? "pro" : "free",
        })
        .eq("user_id", userId);
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = (session.metadata?.user_id as string | undefined) ||
          (await findUserId(session.customer as string));
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await syncSubscription(sub, userId ?? undefined);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          (sub.metadata?.user_id as string | undefined) ||
          (await findUserId(sub.customer as string));
        if (userId) {
          await admin
            .from("profiles")
            .update({
              subscription_status: "canceled",
              plan_type: "free",
              stripe_subscription_id: null,
            })
            .eq("user_id", userId);
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await syncSubscription(sub);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await findUserId(invoice.customer as string);
        if (userId) {
          await admin
            .from("profiles")
            .update({ subscription_status: "past_due" })
            .eq("user_id", userId);
        }
        break;
      }
    }

    // Audit log
    const userIdForLog =
      (event.data.object as any)?.metadata?.user_id ||
      (await findUserId((event.data.object as any)?.customer ?? null));
    await admin.from("subscription_events").insert({
      user_id: userIdForLog,
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as any,
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook handler error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
