-- ===========================================
-- JOGA.I MVP - Database Schema
-- ===========================================

-- 1. ENUM TYPES
-- ===========================================

-- User roles enum
CREATE TYPE public.app_role AS ENUM ('player', 'admin');

-- Gender enum
CREATE TYPE public.gender_type AS ENUM ('masculino', 'feminino');

-- Player position enum
CREATE TYPE public.player_position AS ENUM ('GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA');

-- Dominant foot enum
CREATE TYPE public.dominant_foot AS ENUM ('direito', 'esquerdo', 'ambidestro');

-- Card rarity enum
CREATE TYPE public.card_rarity AS ENUM ('bronze', 'prata', 'ouro', 'ouro_raro', 'roxo', 'azul');

-- Pelada type enum
CREATE TYPE public.pelada_type AS ENUM ('publica', 'privada');

-- Attendance status enum
CREATE TYPE public.attendance_status AS ENUM ('confirmado', 'talvez', 'nao_vou', 'pendente');

-- Pelada member role enum
CREATE TYPE public.pelada_role AS ENUM ('admin', 'player', 'guest');

-- Card type enum (yellow/red)
CREATE TYPE public.card_type AS ENUM ('amarelo', 'vermelho');

-- ===========================================
-- 2. CORE TABLES
-- ===========================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  gender public.gender_type,
  position public.player_position NOT NULL DEFAULT 'MEI',
  height_cm INTEGER,
  weight_kg INTEGER,
  dominant_foot public.dominant_foot DEFAULT 'direito',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'player',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Player cards table
CREATE TABLE public.player_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  overall INTEGER NOT NULL DEFAULT 50 CHECK (overall >= 0 AND overall <= 99),
  pace INTEGER NOT NULL DEFAULT 50 CHECK (pace >= 0 AND pace <= 99),
  shooting INTEGER NOT NULL DEFAULT 50 CHECK (shooting >= 0 AND shooting <= 99),
  passing INTEGER NOT NULL DEFAULT 50 CHECK (passing >= 0 AND passing <= 99),
  dribbling INTEGER NOT NULL DEFAULT 50 CHECK (dribbling >= 0 AND dribbling <= 99),
  defending INTEGER NOT NULL DEFAULT 50 CHECK (defending >= 0 AND defending <= 99),
  physical INTEGER NOT NULL DEFAULT 50 CHECK (physical >= 0 AND physical <= 99),
  rarity public.card_rarity NOT NULL DEFAULT 'ouro',
  games_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===========================================
-- 3. PELADA TABLES
-- ===========================================

-- Peladas (match events)
CREATE TABLE public.peladas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  pelada_type public.pelada_type NOT NULL DEFAULT 'privada',
  max_players INTEGER DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pelada members (participation)
CREATE TABLE public.pelada_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id UUID REFERENCES public.peladas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name TEXT,
  guest_position public.player_position,
  role public.pelada_role NOT NULL DEFAULT 'player',
  status public.attendance_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_or_guest CHECK (
    (user_id IS NOT NULL AND guest_name IS NULL) OR 
    (user_id IS NULL AND guest_name IS NOT NULL)
  ),
  UNIQUE (pelada_id, user_id),
  UNIQUE (pelada_id, guest_name)
);

-- Pelada chat messages
CREATE TABLE public.pelada_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id UUID REFERENCES public.peladas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===========================================
-- 4. MATCH TABLES
-- ===========================================

-- Matches (actual games within peladas)
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id UUID REFERENCES public.peladas(id) ON DELETE CASCADE NOT NULL,
  match_number INTEGER NOT NULL DEFAULT 1,
  team_a_score INTEGER NOT NULL DEFAULT 0,
  team_b_score INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  voting_open BOOLEAN NOT NULL DEFAULT false,
  voting_deadline TIMESTAMP WITH TIME ZONE,
  is_finished BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Match teams (who played on which team)
CREATE TABLE public.match_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  pelada_member_id UUID REFERENCES public.pelada_members(id) ON DELETE CASCADE NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('A', 'B')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (match_id, pelada_member_id)
);

-- Match stats (goals, assists, cards per player)
CREATE TABLE public.match_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  pelada_member_id UUID REFERENCES public.pelada_members(id) ON DELETE CASCADE NOT NULL,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (match_id, pelada_member_id)
);

-- Match votes (post-match rating 0-5 stars)
CREATE TABLE public.match_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rated_member_id UUID REFERENCES public.pelada_members(id) ON DELETE CASCADE NOT NULL,
  stars INTEGER NOT NULL CHECK (stars >= 0 AND stars <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (match_id, voter_id, rated_member_id)
);

-- ===========================================
-- 5. SECURITY DEFINER FUNCTIONS
-- ===========================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin of a pelada
CREATE OR REPLACE FUNCTION public.is_pelada_admin(_user_id UUID, _pelada_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pelada_members
    WHERE pelada_id = _pelada_id
      AND user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Function to check if user is member of a pelada
CREATE OR REPLACE FUNCTION public.is_pelada_member(_user_id UUID, _pelada_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pelada_members
    WHERE pelada_id = _pelada_id
      AND user_id = _user_id
  )
$$;

-- ===========================================
-- 6. ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peladas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pelada_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pelada_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_votes ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- USER_ROLES POLICIES
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- PLAYER_CARDS POLICIES
CREATE POLICY "Cards are viewable by everyone" 
ON public.player_cards FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own card" 
ON public.player_cards FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own card" 
ON public.player_cards FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- PELADAS POLICIES
CREATE POLICY "Public peladas are viewable by everyone" 
ON public.peladas FOR SELECT 
USING (pelada_type = 'publica' OR public.is_pelada_member(auth.uid(), id) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create peladas" 
ON public.peladas FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Pelada admins can update their peladas" 
ON public.peladas FOR UPDATE 
USING (public.is_pelada_admin(auth.uid(), id));

CREATE POLICY "Pelada admins can delete their peladas" 
ON public.peladas FOR DELETE 
USING (public.is_pelada_admin(auth.uid(), id));

-- PELADA_MEMBERS POLICIES
CREATE POLICY "Members are viewable by pelada participants" 
ON public.pelada_members FOR SELECT 
USING (public.is_pelada_member(auth.uid(), pelada_id) OR 
       EXISTS (SELECT 1 FROM public.peladas WHERE id = pelada_id AND pelada_type = 'publica'));

CREATE POLICY "Users can join peladas" 
ON public.pelada_members FOR INSERT 
WITH CHECK (auth.uid() = user_id OR public.is_pelada_admin(auth.uid(), pelada_id));

CREATE POLICY "Users can update their own membership" 
ON public.pelada_members FOR UPDATE 
USING (auth.uid() = user_id OR public.is_pelada_admin(auth.uid(), pelada_id));

CREATE POLICY "Admins can remove members" 
ON public.pelada_members FOR DELETE 
USING (public.is_pelada_admin(auth.uid(), pelada_id));

-- PELADA_MESSAGES POLICIES
CREATE POLICY "Messages are viewable by pelada members" 
ON public.pelada_messages FOR SELECT 
USING (public.is_pelada_member(auth.uid(), pelada_id));

CREATE POLICY "Members can send messages" 
ON public.pelada_messages FOR INSERT 
WITH CHECK (auth.uid() = user_id AND public.is_pelada_member(auth.uid(), pelada_id));

-- MATCHES POLICIES
CREATE POLICY "Matches are viewable by pelada members" 
ON public.matches FOR SELECT 
USING (public.is_pelada_member(auth.uid(), pelada_id));

CREATE POLICY "Admins can create matches" 
ON public.matches FOR INSERT 
WITH CHECK (public.is_pelada_admin(auth.uid(), pelada_id));

CREATE POLICY "Admins can update matches" 
ON public.matches FOR UPDATE 
USING (public.is_pelada_admin(auth.uid(), pelada_id));

-- MATCH_TEAMS POLICIES
CREATE POLICY "Teams are viewable by pelada members" 
ON public.match_teams FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.matches m 
  WHERE m.id = match_id 
  AND public.is_pelada_member(auth.uid(), m.pelada_id)
));

CREATE POLICY "Admins can manage teams" 
ON public.match_teams FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.matches m 
  WHERE m.id = match_id 
  AND public.is_pelada_admin(auth.uid(), m.pelada_id)
));

CREATE POLICY "Admins can update teams" 
ON public.match_teams FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.matches m 
  WHERE m.id = match_id 
  AND public.is_pelada_admin(auth.uid(), m.pelada_id)
));

CREATE POLICY "Admins can delete teams" 
ON public.match_teams FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.matches m 
  WHERE m.id = match_id 
  AND public.is_pelada_admin(auth.uid(), m.pelada_id)
));

-- MATCH_STATS POLICIES
CREATE POLICY "Stats are viewable by pelada members" 
ON public.match_stats FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.matches m 
  WHERE m.id = match_id 
  AND public.is_pelada_member(auth.uid(), m.pelada_id)
));

CREATE POLICY "Admins can manage stats" 
ON public.match_stats FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.matches m 
  WHERE m.id = match_id 
  AND public.is_pelada_admin(auth.uid(), m.pelada_id)
));

-- MATCH_VOTES POLICIES
CREATE POLICY "Votes are viewable after voting closes" 
ON public.match_votes FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.matches m 
  WHERE m.id = match_id 
  AND m.is_finished = true
  AND public.is_pelada_member(auth.uid(), m.pelada_id)
));

CREATE POLICY "Members can vote during voting period" 
ON public.match_votes FOR INSERT 
WITH CHECK (
  auth.uid() = voter_id 
  AND EXISTS (
    SELECT 1 FROM public.matches m 
    WHERE m.id = match_id 
    AND m.voting_open = true
    AND public.is_pelada_member(auth.uid(), m.pelada_id)
  )
);

-- ===========================================
-- 7. TRIGGERS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_player_cards_updated_at
  BEFORE UPDATE ON public.player_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_peladas_updated_at
  BEFORE UPDATE ON public.peladas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pelada_members_updated_at
  BEFORE UPDATE ON public.pelada_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile and card on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Jogador'));
  
  -- Create player card with default values
  INSERT INTO public.player_cards (user_id)
  VALUES (NEW.id);
  
  -- Assign default player role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to make pelada creator an admin
CREATE OR REPLACE FUNCTION public.handle_new_pelada()
RETURNS TRIGGER AS $$
BEGIN
  -- Add creator as admin member
  INSERT INTO public.pelada_members (pelada_id, user_id, role, status)
  VALUES (NEW.id, NEW.created_by, 'admin', 'confirmado');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to add creator as admin
CREATE TRIGGER on_pelada_created
  AFTER INSERT ON public.peladas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_pelada();

-- ===========================================
-- 8. INDEXES FOR PERFORMANCE
-- ===========================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_player_cards_user_id ON public.player_cards(user_id);
CREATE INDEX idx_player_cards_overall ON public.player_cards(overall DESC);
CREATE INDEX idx_peladas_scheduled_date ON public.peladas(scheduled_date);
CREATE INDEX idx_peladas_type ON public.peladas(pelada_type);
CREATE INDEX idx_pelada_members_pelada_id ON public.pelada_members(pelada_id);
CREATE INDEX idx_pelada_members_user_id ON public.pelada_members(user_id);
CREATE INDEX idx_pelada_messages_pelada_id ON public.pelada_messages(pelada_id);
CREATE INDEX idx_matches_pelada_id ON public.matches(pelada_id);
CREATE INDEX idx_match_stats_match_id ON public.match_stats(match_id);
CREATE INDEX idx_match_votes_match_id ON public.match_votes(match_id);