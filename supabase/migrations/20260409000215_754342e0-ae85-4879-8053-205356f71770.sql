-- Prevent duplicate votes: one vote per voter per rated player per match
CREATE UNIQUE INDEX IF NOT EXISTS unique_match_vote_per_voter 
ON public.match_votes (match_id, voter_id, rated_member_id);

-- Prevent duplicate award votes: one award type per voter per match
CREATE UNIQUE INDEX IF NOT EXISTS unique_match_award_vote_per_voter 
ON public.match_award_votes (match_id, voter_id, award_type);