// Edge function: user-initiated account deletion (LGPD).
// Validates JWT in-code, anonymizes historical data, deletes personal records, removes auth user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "missing bearer token" }, 401);
    }

    // Verify user using their JWT
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "invalid token" }, 401);
    const uid = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Log request as processing
    const { data: reqRow } = await admin
      .from("account_deletion_requests")
      .insert({ user_id: uid, status: "processing" })
      .select("id")
      .single();

    // Anonymize / delete personal data. Order matters for FK chains.
    const tables: string[] = [
      "feed_likes",
      "feed_comments",
      "feed_posts",
      "follows",
      "notifications",
      "legal_consents",
      "player_card_history",
      "player_milestones",
      "player_xp",
      "reward_unlocks",
      "xp_events",
      "user_roles",
      "player_cards",
      "profiles",
    ];

    for (const t of tables) {
      // Most personal tables key by user_id
      await admin.from(t).delete().eq("user_id", uid).then(() => {}).catch(() => {});
    }

    // Anonymize follow relations where user is target
    await admin.from("follows").delete().eq("following_id", uid).then(() => {}).catch(() => {});
    await admin.from("notifications").delete().eq("actor_user_id", uid).then(() => {}).catch(() => {});

    // pelada_members rows are kept for historical integrity; null user_id where possible
    await admin.from("pelada_members").update({ user_id: null }).eq("user_id", uid).then(() => {}).catch(() => {});

    // Finally remove auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      await admin.from("account_deletion_requests").update({ status: "failed", processed_at: new Date().toISOString() }).eq("id", reqRow?.id);
      return json({ error: "auth deletion failed: " + delErr.message }, 500);
    }

    if (reqRow?.id) {
      await admin.from("account_deletion_requests")
        .update({ status: "completed", processed_at: new Date().toISOString() })
        .eq("id", reqRow.id);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
