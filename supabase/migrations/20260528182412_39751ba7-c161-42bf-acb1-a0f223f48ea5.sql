
-- 1. pelada_teams
CREATE TABLE public.pelada_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id uuid NOT NULL,
  occurrence_id uuid,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'white',
  position_in_queue integer NOT NULL DEFAULT 0,
  is_playing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pelada_teams_pelada ON public.pelada_teams(pelada_id);
CREATE INDEX idx_pelada_teams_occ ON public.pelada_teams(occurrence_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pelada_teams TO authenticated;
GRANT ALL ON public.pelada_teams TO service_role;

ALTER TABLE public.pelada_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view pelada teams" ON public.pelada_teams
  FOR SELECT TO authenticated
  USING (public.is_pelada_member(auth.uid(), pelada_id));

CREATE POLICY "Admins manage pelada teams" ON public.pelada_teams
  FOR ALL TO authenticated
  USING (public.is_pelada_admin(auth.uid(), pelada_id))
  WITH CHECK (public.is_pelada_admin(auth.uid(), pelada_id));

-- 2. pelada_team_members
CREATE TABLE public.pelada_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  pelada_member_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, pelada_member_id)
);
CREATE INDEX idx_ptm_team ON public.pelada_team_members(team_id);
CREATE INDEX idx_ptm_member ON public.pelada_team_members(pelada_member_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pelada_team_members TO authenticated;
GRANT ALL ON public.pelada_team_members TO service_role;

ALTER TABLE public.pelada_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view team members" ON public.pelada_team_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pelada_teams t
    WHERE t.id = pelada_team_members.team_id
      AND public.is_pelada_member(auth.uid(), t.pelada_id)
  ));

CREATE POLICY "Admins manage team members" ON public.pelada_team_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pelada_teams t
    WHERE t.id = pelada_team_members.team_id
      AND public.is_pelada_admin(auth.uid(), t.pelada_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pelada_teams t
    WHERE t.id = pelada_team_members.team_id
      AND public.is_pelada_admin(auth.uid(), t.pelada_id)
  ));

-- 3. pelada_timeline_events
CREATE TABLE public.pelada_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id uuid NOT NULL,
  occurrence_id uuid,
  match_id uuid,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_timeline_pelada ON public.pelada_timeline_events(pelada_id, created_at);
CREATE INDEX idx_timeline_occ ON public.pelada_timeline_events(occurrence_id, created_at);
CREATE INDEX idx_timeline_match ON public.pelada_timeline_events(match_id);

GRANT SELECT, INSERT, DELETE ON public.pelada_timeline_events TO authenticated;
GRANT ALL ON public.pelada_timeline_events TO service_role;

ALTER TABLE public.pelada_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view timeline" ON public.pelada_timeline_events
  FOR SELECT TO authenticated
  USING (public.is_pelada_member(auth.uid(), pelada_id));

CREATE POLICY "Admins insert timeline" ON public.pelada_timeline_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_pelada_admin(auth.uid(), pelada_id) AND auth.uid() = actor_id);

CREATE POLICY "Admins delete timeline" ON public.pelada_timeline_events
  FOR DELETE TO authenticated
  USING (public.is_pelada_admin(auth.uid(), pelada_id));

-- 4. matches alterations
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS team_a_id uuid,
  ADD COLUMN IF NOT EXISTS team_b_id uuid,
  ADD COLUMN IF NOT EXISTS winner_team_id uuid,
  ADD COLUMN IF NOT EXISTS coin_flip_winner_id uuid,
  ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS added_time_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;
