import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlayerInput {
  member_id: string;
  name: string;
  overall: number;
  position: string;
  level?: number;
  recent_avg?: number;
}

interface Body {
  players: PlayerInput[];
  num_teams: number;
  team_size?: number;
}

// Deterministic snake-draft fallback
function fallbackBalance(players: PlayerInput[], numTeams: number) {
  const sorted = [...players].sort((a, b) => (b.overall || 50) - (a.overall || 50));
  const teams: PlayerInput[][] = Array.from({ length: numTeams }, () => []);
  sorted.forEach((p, i) => {
    const round = Math.floor(i / numTeams);
    const idx = round % 2 === 0 ? i % numTeams : numTeams - 1 - (i % numTeams);
    teams[idx].push(p);
  });
  return teams.map((t, i) => ({ name: `Time ${String.fromCharCode(65 + i)}`, players: t.map((p) => p.member_id) }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Require authenticated caller to prevent anonymous AI cost abuse
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.slice(7);
    const { data: claims, error: claimsErr } = await supa.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  try {
    const body: Body = await req.json();
    const { players, num_teams } = body;

    if (!Array.isArray(players) || players.length < num_teams * 2) {
      return new Response(JSON.stringify({ error: "Jogadores insuficientes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback only
      return new Response(JSON.stringify({ teams: fallbackBalance(players, num_teams), source: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um especialista em montar times de futebol amador equilibrados.
Regras OBRIGATÓRIAS:
- Distribuir goleiros (GOL) o mais igualmente possível entre os times.
- Cada time deve ter mistura saudável de defesa (ZAG/LAT), meio (VOL/MEI) e ataque (ATA).
- Diferença de overall médio entre os times deve ser MENOR que 3 pontos.
- Distribuir os jogadores de maior overall proporcionalmente (nunca todos no mesmo time).
- Todos os jogadores devem ser alocados, sem duplicatas.
Retorne SEMPRE via a ferramenta build_teams.`;

    const userPrompt = `Monte ${num_teams} times equilibrados com estes jogadores:\n${JSON.stringify(players, null, 2)}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_teams",
              description: "Retorna a composição balanceada dos times.",
              parameters: {
                type: "object",
                properties: {
                  teams: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        players: { type: "array", items: { type: "string" }, description: "member_ids" },
                      },
                      required: ["name", "players"],
                    },
                  },
                },
                required: ["teams"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_teams" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429 || resp.status === 402) {
        return new Response(JSON.stringify({ teams: fallbackBalance(players, num_teams), source: "fallback_rate_limited" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", resp.status, await resp.text());
      return new Response(JSON.stringify({ teams: fallbackBalance(players, num_teams), source: "fallback_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    if (!args?.teams || !Array.isArray(args.teams)) {
      return new Response(JSON.stringify({ teams: fallbackBalance(players, num_teams), source: "fallback_parse" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validation: all players accounted for, no duplicates
    const memberSet = new Set(players.map((p) => p.member_id));
    const assigned = new Set<string>();
    let valid = true;
    for (const t of args.teams) {
      for (const id of t.players) {
        if (!memberSet.has(id) || assigned.has(id)) { valid = false; break; }
        assigned.add(id);
      }
    }
    if (!valid || assigned.size !== memberSet.size) {
      return new Response(JSON.stringify({ teams: fallbackBalance(players, num_teams), source: "fallback_invalid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ teams: args.teams, source: "ai" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("balance-teams error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
