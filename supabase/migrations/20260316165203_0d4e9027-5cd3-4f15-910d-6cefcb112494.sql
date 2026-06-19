-- Enable realtime for match_votes and match_award_votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_award_votes;