
-- Add structured location fields to peladas
ALTER TABLE public.peladas
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS full_address text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Add recurrence fields to peladas
ALTER TABLE public.peladas
  ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_day_of_week integer,
  ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_enabled boolean NOT NULL DEFAULT false;

-- Copy existing location data to location_name for backward compat
UPDATE public.peladas SET location_name = location WHERE location_name IS NULL;
