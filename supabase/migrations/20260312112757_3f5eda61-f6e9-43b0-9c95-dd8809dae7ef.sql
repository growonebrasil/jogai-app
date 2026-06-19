
-- Add user_role enum
CREATE TYPE public.user_role AS ENUM ('presidente', 'jogador');

-- Add user_role column to profiles
ALTER TABLE public.profiles ADD COLUMN user_role public.user_role NOT NULL DEFAULT 'jogador';

-- Add username column to profiles (unique)
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;

-- Create follows table
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS on follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone authenticated can see follows
CREATE POLICY "Follows are viewable by authenticated users"
ON public.follows FOR SELECT TO authenticated
USING (true);

-- RLS: Users can follow others
CREATE POLICY "Users can follow others"
ON public.follows FOR INSERT TO authenticated
WITH CHECK (auth.uid() = follower_id AND follower_id != following_id);

-- RLS: Users can unfollow
CREATE POLICY "Users can unfollow"
ON public.follows FOR DELETE TO authenticated
USING (auth.uid() = follower_id);

-- Update handle_new_user to include user_role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, user_role, position)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Jogador'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'user_role', '')::public.user_role, 'jogador'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'position', '')::public.player_position, 'MEI')
  );
  
  INSERT INTO public.player_cards (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'player');
  
  RETURN NEW;
END;
$$;
