
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;

CREATE UNIQUE INDEX IF NOT EXISTS pelada_day_votes_unique_voter
  ON public.pelada_day_votes (occurrence_id, voter_id, rated_member_id);
