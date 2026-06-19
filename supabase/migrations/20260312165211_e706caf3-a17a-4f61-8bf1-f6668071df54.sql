
-- Fix match_teams: allow any team name (not just A/B)
ALTER TABLE public.match_teams DROP CONSTRAINT match_teams_team_check;

-- Fix match_votes: allow 0-10 (not just 0-5)
ALTER TABLE public.match_votes DROP CONSTRAINT match_votes_stars_check;
ALTER TABLE public.match_votes ADD CONSTRAINT match_votes_stars_check CHECK (stars >= 0 AND stars <= 10);
