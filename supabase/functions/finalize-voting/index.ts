import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require a shared CRON secret for this admin-only job
  const cronSecret = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : req.headers.get("x-cron-secret");
  
  if (!cronSecret || !provided || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Find matches that need finalization:
    // voting_open=true AND voting_finalized=false AND is_finished=true
    const { data: openMatches, error: matchErr } = await supabase
      .from("matches")
      .select("id, pelada_id, voting_deadline, occurrence_id")
      .eq("voting_open", true)
      .eq("voting_finalized", false)
      .eq("is_finished", true);

    if (matchErr) throw matchErr;
    if (!openMatches || openMatches.length === 0) {
      return new Response(JSON.stringify({ finalized: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group matches by occurrence_id (session-based voting)
    // Matches without occurrence_id are treated individually (legacy)
    const sessionMap: Record<string, typeof openMatches> = {};
    const legacyMatches: typeof openMatches = [];

    for (const match of openMatches) {
      if (match.occurrence_id) {
        if (!sessionMap[match.occurrence_id]) sessionMap[match.occurrence_id] = [];
        sessionMap[match.occurrence_id].push(match);
      } else {
        legacyMatches.push(match);
      }
    }

    let finalizedCount = 0;

    // Process session-grouped matches
    for (const [occurrenceId, sessionMatches] of Object.entries(sessionMap)) {
      const peladaId = sessionMatches[0].pelada_id;

      // Check if deadline passed (use earliest deadline from session matches)
      const deadlines = sessionMatches.map(m => m.voting_deadline).filter(Boolean);
      const earliestDeadline = deadlines.length > 0
        ? deadlines.sort()[0]
        : null;
      const deadlinePassed = earliestDeadline && new Date(earliestDeadline) <= new Date(now);

      // Check if all eligible voters have voted (using any match in the session)
      const { data: members } = await supabase
        .from("pelada_members")
        .select("id, user_id")
        .eq("pelada_id", peladaId)
        .not("user_id", "is", null);

      const eligibleVoters = (members || []).filter((m: any) => m.user_id);
      const sessionMatchIds = sessionMatches.map(m => m.id);

      // Check votes across any match in the session
      const { data: votes } = await supabase
        .from("match_votes")
        .select("voter_id")
        .in("match_id", sessionMatchIds);

      const votedUserIds = new Set((votes || []).map((v: any) => v.voter_id));
      const allVoted = eligibleVoters.length > 0 && eligibleVoters.every((m: any) => votedUserIds.has(m.user_id));

      if (!deadlinePassed && !allVoted) continue;

      // --- FINALIZE THIS SESSION ---
      finalizedCount += await finalizeMatches(supabase, sessionMatches, peladaId, now);
    }

    // Process legacy matches individually (no occurrence_id)
    for (const match of legacyMatches) {
      const deadlinePassed = match.voting_deadline && new Date(match.voting_deadline) <= new Date(now);

      const { data: members } = await supabase
        .from("pelada_members")
        .select("id, user_id")
        .eq("pelada_id", match.pelada_id)
        .not("user_id", "is", null);

      const eligibleVoters = (members || []).filter((m: any) => m.user_id);

      const { data: votes } = await supabase
        .from("match_votes")
        .select("voter_id")
        .eq("match_id", match.id);

      const votedUserIds = new Set((votes || []).map((v: any) => v.voter_id));
      const allVoted = eligibleVoters.length > 0 && eligibleVoters.every((m: any) => votedUserIds.has(m.user_id));

      if (!deadlinePassed && !allVoted) continue;

      finalizedCount += await finalizeMatches(supabase, [match], match.pelada_id, now);
    }

    return new Response(JSON.stringify({ finalized: finalizedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function finalizeMatches(
  supabase: any,
  matches: { id: string; pelada_id: string }[],
  peladaId: string,
  now: string
): Promise<number> {
  const matchIds = matches.map(m => m.id);

  // 1. Get all award votes across all matches in this session
  const { data: awardVotes } = await supabase
    .from("match_award_votes")
    .select("*")
    .in("match_id", matchIds);

  // 2. Get all numeric votes across all matches for tie-breaking
  const { data: numericVotes } = await supabase
    .from("match_votes")
    .select("rated_member_id, stars")
    .in("match_id", matchIds);

  // 3. Get match stats across all matches for tie-breaking
  const { data: matchStats } = await supabase
    .from("match_stats")
    .select("pelada_member_id, goals, assists")
    .in("match_id", matchIds);

  // Build avg rating map for tie-breaking
  const ratingMap: Record<string, { total: number; count: number }> = {};
  (numericVotes || []).forEach((v: any) => {
    if (!ratingMap[v.rated_member_id]) ratingMap[v.rated_member_id] = { total: 0, count: 0 };
    ratingMap[v.rated_member_id].total += v.stars;
    ratingMap[v.rated_member_id].count += 1;
  });
  const avgRatings: Record<string, number> = {};
  Object.entries(ratingMap).forEach(([id, { total, count }]) => {
    avgRatings[id] = total / count;
  });

  // Build performance map for tie-breaking
  const perfMap: Record<string, number> = {};
  (matchStats || []).forEach((s: any) => {
    perfMap[s.pelada_member_id] = (perfMap[s.pelada_member_id] || 0) + (s.goals || 0) + (s.assists || 0);
  });

  // Count votes per award type (aggregated across all session matches)
  const awardTypes = ["craque", "fair_play", "bola_murcha"];
  // Use the first match as the anchor for storing results
  const anchorMatchId = matchIds[0];

  for (const awardType of awardTypes) {
    const tallies: Record<string, number> = {};
    (awardVotes || []).filter((v: any) => v.award_type === awardType).forEach((v: any) => {
      tallies[v.voted_member_id] = (tallies[v.voted_member_id] || 0) + 1;
    });

    if (Object.keys(tallies).length === 0) continue;

    // Sort by: 1) vote count desc, 2) avg rating desc, 3) performance desc
    const sorted = Object.entries(tallies).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      const ratingA = avgRatings[a[0]] || 0;
      const ratingB = avgRatings[b[0]] || 0;
      if (ratingB !== ratingA) return ratingB - ratingA;
      const perfA = perfMap[a[0]] || 0;
      const perfB = perfMap[b[0]] || 0;
      return perfB - perfA;
    });

    const [winnerId, voteCount] = sorted[0];

    // Store result against the anchor match
    await supabase
      .from("pelada_award_results")
      .upsert({
        match_id: anchorMatchId,
        award_type: awardType,
        winner_member_id: winnerId,
        vote_count: voteCount,
      }, { onConflict: "match_id,award_type" });
  }

  // Mark ALL matches in this session as finalized
  for (const matchId of matchIds) {
    await supabase
      .from("matches")
      .update({
        voting_finalized: true,
        voting_finalized_at: now,
        voting_open: false,
      })
      .eq("id", matchId);
  }

  return matchIds.length;
}
