
-- 1) match_events: granular event log
CREATE TABLE public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  pelada_id uuid NOT NULL,
  occurrence_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('goal','assist','yellow','red')),
  pelada_member_id uuid NOT NULL,
  team text,
  minute integer,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_events_match_id ON public.match_events(match_id);
CREATE INDEX idx_match_events_pelada_id ON public.match_events(pelada_id);
CREATE INDEX idx_match_events_occurrence_id ON public.match_events(occurrence_id);
CREATE INDEX idx_match_events_member_id ON public.match_events(pelada_member_id);

GRANT SELECT, INSERT, DELETE ON public.match_events TO authenticated;
GRANT ALL ON public.match_events TO service_role;

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view match events"
  ON public.match_events FOR SELECT
  TO authenticated
  USING (public.is_pelada_member(auth.uid(), pelada_id));

CREATE POLICY "Admins can insert match events"
  ON public.match_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_pelada_admin(auth.uid(), pelada_id) AND auth.uid() = recorded_by);

CREATE POLICY "Admins can delete match events"
  ON public.match_events FOR DELETE
  TO authenticated
  USING (public.is_pelada_admin(auth.uid(), pelada_id));

-- 2) player_card_history: snapshot per recompute
CREATE TABLE public.player_card_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  occurrence_id uuid,
  pelada_id uuid,
  snapshot jsonb NOT NULL,
  ai_highlight text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pch_user_id ON public.player_card_history(user_id);
CREATE INDEX idx_pch_occurrence_id ON public.player_card_history(occurrence_id);

GRANT SELECT ON public.player_card_history TO authenticated;
GRANT ALL ON public.player_card_history TO service_role;

ALTER TABLE public.player_card_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view card history"
  ON public.player_card_history FOR SELECT
  TO authenticated
  USING (true);
