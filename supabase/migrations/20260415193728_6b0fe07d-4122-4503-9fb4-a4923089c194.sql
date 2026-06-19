
-- Add finalization flag to matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS voting_finalized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voting_finalized_at timestamp with time zone;

-- Table to store official award results after voting closes
CREATE TABLE public.pelada_award_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  award_type text NOT NULL, -- 'craque', 'fair_play', 'bola_murcha'
  winner_member_id uuid NOT NULL REFERENCES public.pelada_members(id) ON DELETE CASCADE,
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(match_id, award_type)
);

-- Enable RLS
ALTER TABLE public.pelada_award_results ENABLE ROW LEVEL SECURITY;

-- Members of the pelada can view finalized results
CREATE POLICY "Members can view award results"
  ON public.pelada_award_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = pelada_award_results.match_id
        AND is_pelada_member(auth.uid(), m.pelada_id)
    )
  );

-- Only service role / edge functions insert results (no user insert)
-- Admins can manage for corrections
CREATE POLICY "Admins can manage award results"
  ON public.pelada_award_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = pelada_award_results.match_id
        AND is_pelada_admin(auth.uid(), m.pelada_id)
    )
  );

-- Enable realtime for award results
ALTER PUBLICATION supabase_realtime ADD TABLE public.pelada_award_results;
