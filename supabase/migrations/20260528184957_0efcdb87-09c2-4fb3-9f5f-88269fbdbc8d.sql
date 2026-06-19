
-- Coin flip results
CREATE TABLE public.coin_flip_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  pelada_id uuid NOT NULL,
  occurrence_id uuid,
  team_cara_id uuid,
  team_coroa_id uuid,
  team_cara_name text,
  team_coroa_name text,
  captain_cara_id uuid,
  captain_coroa_id uuid,
  coin_result text NOT NULL CHECK (coin_result IN ('cara','coroa')),
  winning_team_id uuid,
  losing_team_id uuid,
  winning_team_name text,
  losing_team_name text,
  admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.coin_flip_results TO authenticated;
GRANT ALL ON public.coin_flip_results TO service_role;

ALTER TABLE public.coin_flip_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view coin flips"
  ON public.coin_flip_results FOR SELECT
  TO authenticated
  USING (public.is_pelada_member(auth.uid(), pelada_id));

CREATE POLICY "Admins insert coin flips"
  ON public.coin_flip_results FOR INSERT
  TO authenticated
  WITH CHECK (public.is_pelada_admin(auth.uid(), pelada_id) AND auth.uid() = admin_id);

-- Pelada day votes
CREATE TABLE public.pelada_day_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id uuid NOT NULL,
  occurrence_id uuid NOT NULL,
  voter_id uuid NOT NULL,
  rated_member_id uuid NOT NULL,
  nota_desempenho int CHECK (nota_desempenho BETWEEN 1 AND 5),
  nota_tecnica int CHECK (nota_tecnica BETWEEN 1 AND 5),
  nota_defesa int CHECK (nota_defesa BETWEEN 1 AND 5),
  nota_coletivo int CHECK (nota_coletivo BETWEEN 1 AND 5),
  nota_fair_play int CHECK (nota_fair_play BETWEEN 1 AND 5),
  special_awards jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (occurrence_id, voter_id, rated_member_id)
);

CREATE INDEX idx_pelada_day_votes_occ ON public.pelada_day_votes(occurrence_id);
CREATE INDEX idx_pelada_day_votes_rated ON public.pelada_day_votes(rated_member_id);

GRANT SELECT, INSERT ON public.pelada_day_votes TO authenticated;
GRANT ALL ON public.pelada_day_votes TO service_role;

ALTER TABLE public.pelada_day_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view day votes"
  ON public.pelada_day_votes FOR SELECT
  TO authenticated
  USING (public.is_pelada_member(auth.uid(), pelada_id));

CREATE POLICY "Members can cast day votes"
  ON public.pelada_day_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = voter_id
    AND public.is_pelada_member(auth.uid(), pelada_id)
    AND rated_member_id <> ALL (
      SELECT id FROM public.pelada_members WHERE user_id = auth.uid() AND pelada_id = pelada_day_votes.pelada_id
    )
  );

-- Notified flag on occurrences
ALTER TABLE public.pelada_occurrences
  ADD COLUMN IF NOT EXISTS voting_notified_at timestamptz;
