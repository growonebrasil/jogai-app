
-- Add new columns to peladas
ALTER TABLE public.peladas
  ADD COLUMN IF NOT EXISTS match_id_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text;

-- Create index for search
CREATE INDEX IF NOT EXISTS idx_peladas_match_id_code ON public.peladas (match_id_code);
CREATE INDEX IF NOT EXISTS idx_peladas_neighborhood ON public.peladas (neighborhood);
CREATE INDEX IF NOT EXISTS idx_peladas_city ON public.peladas (city);

-- Function to generate unique match ID code
CREATE OR REPLACE FUNCTION public.generate_match_id_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  new_code text;
  prefix text;
  attempts int := 0;
BEGIN
  -- Pick a random prefix
  prefix := (ARRAY['JG', 'PEL', 'GOL', 'FUT'])[floor(random() * 4 + 1)];
  
  LOOP
    new_code := prefix || '-' || lpad(floor(random() * 99999 + 1)::text, 5, '0');
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.peladas WHERE match_id_code = new_code) THEN
      NEW.match_id_code := new_code;
      RETURN NEW;
    END IF;
    attempts := attempts + 1;
    IF attempts > 10 THEN
      -- Fallback: use more digits
      new_code := prefix || '-' || lpad(floor(random() * 999999 + 1)::text, 6, '0');
      NEW.match_id_code := new_code;
      RETURN NEW;
    END IF;
  END LOOP;
END;
$function$;

-- Create trigger to auto-generate match_id_code on insert
CREATE TRIGGER trg_generate_match_id_code
  BEFORE INSERT ON public.peladas
  FOR EACH ROW
  WHEN (NEW.match_id_code IS NULL)
  EXECUTE FUNCTION public.generate_match_id_code();

-- Generate codes for existing peladas that don't have one
UPDATE public.peladas 
SET match_id_code = 'JG-' || lpad(floor(random() * 99999 + 1)::text, 5, '0')
WHERE match_id_code IS NULL;

-- Update RLS: allow authenticated users to search/view public peladas
-- Already covered by existing SELECT policy
