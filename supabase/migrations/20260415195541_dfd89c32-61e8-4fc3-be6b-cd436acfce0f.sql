-- Add occurrence_id to matches to link each match to its session
ALTER TABLE public.matches
ADD COLUMN occurrence_id uuid REFERENCES public.pelada_occurrences(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_matches_occurrence_id ON public.matches(occurrence_id);
