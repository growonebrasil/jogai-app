
-- Table for special award votes (Craque, Fair Play, Bola Murcha)
CREATE TABLE public.match_award_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  voted_member_id UUID NOT NULL REFERENCES public.pelada_members(id) ON DELETE CASCADE,
  award_type TEXT NOT NULL CHECK (award_type IN ('craque', 'fair_play', 'bola_murcha')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, voter_id, award_type)
);

-- Enable RLS
ALTER TABLE public.match_award_votes ENABLE ROW LEVEL SECURITY;

-- Policies for match_award_votes
CREATE POLICY "Members can vote awards" ON public.match_award_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_award_votes.match_id
        AND m.voting_open = true
        AND is_pelada_member(auth.uid(), m.pelada_id)
    )
  );

CREATE POLICY "Award votes viewable after match finished" ON public.match_award_votes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_award_votes.match_id
        AND m.is_finished = true
        AND is_pelada_member(auth.uid(), m.pelada_id)
    )
  );

-- Enable realtime on match_stats for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_teams;
