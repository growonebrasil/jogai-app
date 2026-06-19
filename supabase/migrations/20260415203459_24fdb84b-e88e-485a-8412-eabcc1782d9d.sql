
-- Player XP tracking
CREATE TABLE public.player_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "XP viewable by everyone"
  ON public.player_xp FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own XP"
  ON public.player_xp FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own XP"
  ON public.player_xp FOR UPDATE
  USING (auth.uid() = user_id);

-- Milestone achievements log
CREATE TABLE public.player_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stat_type text NOT NULL, -- 'goals' or 'assists'
  threshold integer NOT NULL, -- e.g. 10, 20, 50, 100
  xp_reward integer NOT NULL DEFAULT 0,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, stat_type, threshold)
);

ALTER TABLE public.player_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Milestones viewable by everyone"
  ON public.player_milestones FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own milestones"
  ON public.player_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at on player_xp
CREATE TRIGGER update_player_xp_updated_at
  BEFORE UPDATE ON public.player_xp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
