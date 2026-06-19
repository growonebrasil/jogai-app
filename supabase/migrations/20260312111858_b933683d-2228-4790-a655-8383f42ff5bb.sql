
-- Add plan_type enum
CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'demo');

-- Add plan_type column to profiles
ALTER TABLE public.profiles ADD COLUMN plan_type public.plan_type NOT NULL DEFAULT 'free';

-- Create security definer function to check plan
CREATE OR REPLACE FUNCTION public.has_pro_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND plan_type IN ('pro', 'demo')
  )
$$;
