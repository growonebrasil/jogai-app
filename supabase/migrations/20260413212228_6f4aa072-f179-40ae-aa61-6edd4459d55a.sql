
CREATE POLICY "Admins can delete matches" ON public.matches FOR DELETE TO public USING (is_pelada_admin(auth.uid(), pelada_id));

CREATE POLICY "Admins can delete match votes" ON public.match_votes FOR DELETE TO public USING (EXISTS (SELECT 1 FROM matches m WHERE m.id = match_votes.match_id AND is_pelada_admin(auth.uid(), m.pelada_id)));

CREATE POLICY "Admins can delete award votes" ON public.match_award_votes FOR DELETE TO public USING (EXISTS (SELECT 1 FROM matches m WHERE m.id = match_award_votes.match_id AND is_pelada_admin(auth.uid(), m.pelada_id)));
