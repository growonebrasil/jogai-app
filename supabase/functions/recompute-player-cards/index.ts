// Recompute player_cards based on real match data + light AI flavor.
// Idempotent per (occurrence_id). Admin-only.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Body {
  pelada_id: string;
  occurrence_id?: string | null;
}

const clamp = (v: number, lo = 30, hi = 99) => Math.max(lo, Math.min(hi, Math.floor(v)));

// Positional weights to derive overall (EAFC-ish, simplified)
const POSITION_WEIGHTS: Record<string, Record<string, number>> = {
  GOL: { defending: 0.35, physical: 0.2, pace: 0.1, passing: 0.15, dribbling: 0.05, shooting: 0.15 },
  ZAG: { defending: 0.35, physical: 0.25, passing: 0.15, pace: 0.15, dribbling: 0.05, shooting: 0.05 },
  LAT: { pace: 0.25, defending: 0.2, physical: 0.15, passing: 0.2, dribbling: 0.1, shooting: 0.1 },
  VOL: { passing: 0.25, defending: 0.25, physical: 0.2, dribbling: 0.15, pace: 0.1, shooting: 0.05 },
  MEI: { passing: 0.3, dribbling: 0.25, shooting: 0.15, pace: 0.15, physical: 0.1, defending: 0.05 },
  ATA: { shooting: 0.3, pace: 0.25, dribbling: 0.25, physical: 0.1, passing: 0.05, defending: 0.05 },
};

function weightedOverall(position: string, stats: Record<string, number>) {
  const w = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.MEI;
  let total = 0;
  for (const k of Object.keys(w)) total += (stats[k] || 50) * w[k];
  return clamp(total);
}

async function fetchAiAdjustment(snapshot: any): Promise<{ highlight: string; bump: Record<string, number> }> {
  if (!LOVABLE_API_KEY) return { highlight: "Bom desempenho na rodada.", bump: {} };
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um analista de futebol amador. Retorne JSON com {highlight: string curto em PT-BR, bump: {pace?:int,-2..2, shooting?:int, passing?:int, dribbling?:int, defending?:int, physical?:int}} ajustando até 2 atributos." },
          { role: "user", content: JSON.stringify(snapshot) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "card_adjustment",
            parameters: {
              type: "object",
              properties: {
                highlight: { type: "string" },
                bump: {
                  type: "object",
                  properties: {
                    pace: { type: "integer" }, shooting: { type: "integer" },
                    passing: { type: "integer" }, dribbling: { type: "integer" },
                    defending: { type: "integer" }, physical: { type: "integer" },
                  },
                },
              },
              required: ["highlight", "bump"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "card_adjustment" } },
      }),
    });
    if (!r.ok) return { highlight: "Bom desempenho na rodada.", bump: {} };
    const data = await r.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return { highlight: "Bom desempenho na rodada.", bump: {} };
    const parsed = JSON.parse(args);
    const safeBump: Record<string, number> = {};
    for (const k of Object.keys(parsed.bump || {})) {
      const v = Math.max(-2, Math.min(2, Math.floor(parsed.bump[k])));
      if (v !== 0) safeBump[k] = v;
    }
    return { highlight: String(parsed.highlight || ""), bump: safeBump };
  } catch (e) {
    console.error("AI error", e);
    return { highlight: "Bom desempenho na rodada.", bump: {} };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userRes.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: "unauth" }), { status: 401, headers: corsHeaders });

    const body: Body = await req.json();
    if (!body.pelada_id) {
      return new Response(JSON.stringify({ error: "pelada_id required" }), { status: 400, headers: corsHeaders });
    }

    // Admin check
    const { data: adminCheck } = await supabase.rpc("is_pelada_admin", { _user_id: userId, _pelada_id: body.pelada_id });
    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Find matches scoped to occurrence (or whole pelada)
    let matchQ = admin.from("matches").select("id").eq("pelada_id", body.pelada_id).eq("is_finished", true);
    if (body.occurrence_id) matchQ = matchQ.eq("occurrence_id", body.occurrence_id);
    const { data: matches } = await matchQ;
    const matchIds = (matches || []).map((m: any) => m.id);
    if (matchIds.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Aggregate stats + teams + day votes
    const [{ data: stats }, { data: teams }, { data: members }, { data: dayVotes }] = await Promise.all([
      admin.from("match_stats").select("*").in("match_id", matchIds),
      admin.from("match_teams").select("match_id, pelada_member_id, team").in("match_id", matchIds),
      admin.from("pelada_members").select("id, user_id").eq("pelada_id", body.pelada_id),
      body.occurrence_id
        ? admin.from("pelada_day_votes").select("rated_member_id, nota_desempenho, nota_tecnica, nota_defesa, nota_coletivo, nota_fair_play").eq("occurrence_id", body.occurrence_id)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const memberToUser: Record<string, string> = {};
    (members || []).forEach((m: any) => { if (m.user_id) memberToUser[m.id] = m.user_id; });

    // group by user
    const agg: Record<string, { goals: number; assists: number; y: number; r: number; games: number }> = {};
    const seenGames: Record<string, Set<string>> = {};
    (teams || []).forEach((t: any) => {
      const uid = memberToUser[t.pelada_member_id]; if (!uid) return;
      seenGames[uid] = seenGames[uid] || new Set();
      seenGames[uid].add(t.match_id);
    });
    (stats || []).forEach((s: any) => {
      const uid = memberToUser[s.pelada_member_id]; if (!uid) return;
      const a = agg[uid] = agg[uid] || { goals: 0, assists: 0, y: 0, r: 0, games: 0 };
      a.goals += s.goals; a.assists += s.assists; a.y += s.yellow_cards; a.r += s.red_cards;
    });
    for (const uid of Object.keys(seenGames)) {
      agg[uid] = agg[uid] || { goals: 0, assists: 0, y: 0, r: 0, games: 0 };
      agg[uid].games = seenGames[uid].size;
    }

    // Aggregate votes per user (average across 5 categories, normalized 1-5 → 30-99)
    const voteAvgByUser: Record<string, number> = {};
    const voteCountByUser: Record<string, number> = {};
    const userToMember: Record<string, string> = {};
    Object.entries(memberToUser).forEach(([mid, uid]) => { userToMember[uid] = mid; });
    (dayVotes || []).forEach((v: any) => {
      const uid = memberToUser[v.rated_member_id]; if (!uid) return;
      const vals = [v.nota_desempenho, v.nota_tecnica, v.nota_defesa, v.nota_coletivo, v.nota_fair_play].filter((n) => typeof n === "number");
      if (vals.length === 0) return;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length; // 1..5
      voteAvgByUser[uid] = (voteAvgByUser[uid] || 0) + avg;
      voteCountByUser[uid] = (voteCountByUser[uid] || 0) + 1;
    });

    let updated = 0;
    for (const uid of Object.keys(agg)) {
      const a = agg[uid];
      const [{ data: profile }, { data: card }] = await Promise.all([
        admin.from("profiles").select("position").eq("user_id", uid).maybeSingle(),
        admin.from("player_cards").select("*").eq("user_id", uid).maybeSingle(),
      ]);
      if (!card) continue;
      const position = (profile as any)?.position || "MEI";

      // Performance signals → small deltas on existing stats
      const games = Math.max(1, a.games);
      const gp = a.goals / games; // goals per game
      const ap = a.assists / games;
      const yp = a.y / games;
      const rp = a.r / games;

      const base = {
        pace: card.pace, shooting: card.shooting, passing: card.passing,
        dribbling: card.dribbling, defending: card.defending, physical: card.physical,
      };
      // Deterministic nudges, capped at ±3 per recompute
      const next = { ...base };
      const nudge = (k: keyof typeof base, d: number) => {
        next[k] = clamp(next[k] + Math.max(-3, Math.min(3, d)));
      };
      nudge("shooting", Math.round(gp * 2 - rp * 2));
      nudge("passing", Math.round(ap * 2));
      nudge("dribbling", Math.round(gp + ap));
      nudge("defending", Math.round(-rp * 2 - yp));
      nudge("physical", Math.round((games >= 2 ? 1 : 0) - rp));
      nudge("pace", Math.round((games >= 3 ? 1 : 0)));

      // AI flavor
      const ai = await fetchAiAdjustment({ position, games, goals: a.goals, assists: a.assists, yellows: a.y, reds: a.r });
      for (const k of Object.keys(ai.bump)) {
        if (k in next) nudge(k as any, ai.bump[k]);
      }

      // Combined overall: 60% stats-based + 25% votes + 15% historical card (damping)
      const statsOverall = weightedOverall(position, next);
      const voteOverallRaw = voteCountByUser[uid] && voteCountByUser[uid] > 0
        ? (voteAvgByUser[uid] / voteCountByUser[uid]) // 1..5
        : null;
      const voteOverall = voteOverallRaw !== null
        ? clamp(30 + ((voteOverallRaw - 1) / 4) * 69) // map 1..5 -> 30..99
        : statsOverall;
      const historical = card.overall || 50;
      let overall = Math.floor(statsOverall * 0.60 + voteOverall * 0.25 + historical * 0.15);
      // Cards penalty
      overall -= a.y * 1 + a.r * 3;
      // Damping: cap change at ±3 per pelada
      const delta = Math.max(-3, Math.min(3, overall - historical));
      overall = clamp(historical + delta);

      await admin.from("player_cards").update({
        ...next,
        overall,
        games_played: (card.games_played || 0) + a.games,
        updated_at: new Date().toISOString(),
      }).eq("user_id", uid);

      await admin.from("player_card_history").insert({
        user_id: uid,
        occurrence_id: body.occurrence_id ?? null,
        pelada_id: body.pelada_id,
        snapshot: { before: base, after: next, overall, agg: a, position, voteOverall, statsOverall, historical },
        ai_highlight: ai.highlight,
      });


      updated++;
    }

    return new Response(JSON.stringify({ updated, matches: matchIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recompute error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
