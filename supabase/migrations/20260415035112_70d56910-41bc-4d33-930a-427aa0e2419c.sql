
-- Create enum for occurrence status
CREATE TYPE public.occurrence_status AS ENUM ('scheduled', 'in_progress', 'finished', 'canceled');

-- Create pelada_occurrences table
CREATE TABLE public.pelada_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  status public.occurrence_status NOT NULL DEFAULT 'scheduled',
  cancel_reason text,
  voting_deadline timestamp with time zone,
  voting_closed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(pelada_id, occurrence_date)
);

-- Enable RLS
ALTER TABLE public.pelada_occurrences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view occurrences"
ON public.pelada_occurrences FOR SELECT
USING (is_pelada_member(auth.uid(), pelada_id));

CREATE POLICY "Admins can manage occurrences"
ON public.pelada_occurrences FOR ALL
USING (is_pelada_admin(auth.uid(), pelada_id));

-- Trigger for updated_at
CREATE TRIGGER update_pelada_occurrences_updated_at
BEFORE UPDATE ON public.pelada_occurrences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pelada_occurrences;
