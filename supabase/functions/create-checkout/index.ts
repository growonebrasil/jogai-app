import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData.user) return json({ error: "Não autenticado" }, 401);
    const user = userData.user;

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_role, stripe_customer_id, name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile || profile.user_role !== "presidente") {
      return json({ error: "Apenas Presidentes podem assinar o JOGA.I PRO" }, 403);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-11-20.acacia" as any,
    });

    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const existing = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          name: profile.name || undefined,
          metadata: { user_id: user.id },
        });
        customerId = customer.id;
      }
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", user.id);
    }

    const origin = req.headers.get("origin") || "https://jogaiapp.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY")!, quantity: 1 }],
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout-cancel`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("create-checkout error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
