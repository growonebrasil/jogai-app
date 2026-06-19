
-- ============ XP EVENTS (audit + dedup) ============
CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL, -- 'attendance_confirm','match_played','goal','assist','vote_cast','vote_received','craque','fair_play','streak_week'
  xp integer NOT NULL,
  ref_type text,  -- e.g. 'match','occurrence','vote'
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source, ref_type, ref_id)
);

GRANT SELECT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp events"
ON public.xp_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_xp_events_user ON public.xp_events(user_id, created_at DESC);

-- ============ REWARD UNLOCKS ============
CREATE TABLE public.reward_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_key text NOT NULL, -- e.g. 'frame_bronze','badge_streak_4','theme_neon'
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_key)
);

GRANT SELECT ON public.reward_unlocks TO authenticated, anon;
GRANT INSERT ON public.reward_unlocks TO authenticated;
GRANT ALL ON public.reward_unlocks TO service_role;

ALTER TABLE public.reward_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reward unlocks viewable by everyone"
ON public.reward_unlocks FOR SELECT
USING (true);

CREATE POLICY "Users can unlock own rewards"
ON public.reward_unlocks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============ NOTIFICATIONS: CATEGORY ============
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'social';

-- Backfill based on existing types
UPDATE public.notifications SET category = CASE
  WHEN type IN ('new_follower') THEN 'social'
  WHEN type IN ('payment_created') THEN 'cobranca'
  WHEN type LIKE 'match_%' OR type LIKE 'partida_%' THEN 'partida'
  WHEN type LIKE 'pelada_%' OR type LIKE 'occurrence_%' OR type IN ('attendance_request','draw_started') THEN 'pelada'
  ELSE 'social'
END;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_cat
  ON public.notifications(recipient_user_id, category, created_at DESC);

-- ============ AWARD XP FUNCTION ============
CREATE OR REPLACE FUNCTION public.award_xp(
  _user_id uuid,
  _source text,
  _xp integer,
  _ref_type text DEFAULT NULL,
  _ref_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total int;
  new_level int := 1;
  thresholds int[] := ARRAY[0,100,250,500,850,1300,1900,2700,3800,5200,7000,9500,13000];
  i int;
BEGIN
  IF _user_id IS NULL OR _xp IS NULL OR _xp <= 0 THEN RETURN; END IF;

  -- Dedup insert
  BEGIN
    INSERT INTO public.xp_events (user_id, source, xp, ref_type, ref_id)
    VALUES (_user_id, _source, _xp, _ref_type, _ref_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN; -- already awarded
  END;

  -- Upsert player_xp
  INSERT INTO public.player_xp (user_id, total_xp, level)
  VALUES (_user_id, _xp, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = public.player_xp.total_xp + EXCLUDED.total_xp,
        updated_at = now()
  RETURNING total_xp INTO new_total;

  -- Compute level
  FOR i IN 1..array_length(thresholds,1) LOOP
    IF new_total >= thresholds[i] THEN new_level := i; END IF;
  END LOOP;

  UPDATE public.player_xp SET level = new_level WHERE user_id = _user_id;
END;
$$;

-- player_xp needs a unique on user_id for ON CONFLICT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'player_xp_user_id_key'
  ) THEN
    ALTER TABLE public.player_xp ADD CONSTRAINT player_xp_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ============ XP TRIGGERS ============

-- Attendance confirmation
CREATE OR REPLACE FUNCTION public.xp_on_attendance_confirm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'confirmado' AND (OLD.status IS DISTINCT FROM NEW.status) AND NEW.user_id IS NOT NULL THEN
    PERFORM public.award_xp(NEW.user_id, 'attendance_confirm', 10, 'pelada_member', NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_xp_attendance ON public.pelada_members;
CREATE TRIGGER trg_xp_attendance
AFTER INSERT OR UPDATE OF status ON public.pelada_members
FOR EACH ROW EXECUTE FUNCTION public.xp_on_attendance_confirm();

-- Goals / Assists from match_stats
CREATE OR REPLACE FUNCTION public.xp_on_match_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid;
  old_goals int := COALESCE(OLD.goals, 0);
  old_assists int := COALESCE(OLD.assists, 0);
  d_goals int;
  d_assists int;
BEGIN
  SELECT user_id INTO uid FROM public.pelada_members WHERE id = NEW.pelada_member_id;
  IF uid IS NULL THEN RETURN NEW; END IF;

  d_goals := COALESCE(NEW.goals, 0) - old_goals;
  d_assists := COALESCE(NEW.assists, 0) - old_assists;

  IF d_goals > 0 THEN
    -- one-off cumulative event keyed per match
    PERFORM public.award_xp(uid, 'goal_' || NEW.goals, 15 * d_goals, 'match', NEW.match_id);
  END IF;
  IF d_assists > 0 THEN
    PERFORM public.award_xp(uid, 'assist_' || NEW.assists, 10 * d_assists, 'match', NEW.match_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_xp_match_stats ON public.match_stats;
CREATE TRIGGER trg_xp_match_stats
AFTER INSERT OR UPDATE OF goals, assists ON public.match_stats
FOR EACH ROW EXECUTE FUNCTION public.xp_on_match_stats();

-- Vote cast XP
CREATE OR REPLACE FUNCTION public.xp_on_vote_cast()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp(NEW.voter_id, 'vote_cast', 5, 'match', NEW.match_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_xp_vote_cast ON public.match_votes;
CREATE TRIGGER trg_xp_vote_cast
AFTER INSERT ON public.match_votes
FOR EACH ROW EXECUTE FUNCTION public.xp_on_vote_cast();

-- Match played XP (when match finishes, award everyone on a team)
CREATE OR REPLACE FUNCTION public.xp_on_match_finish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec record;
BEGIN
  IF NEW.is_finished = true AND (OLD.is_finished IS DISTINCT FROM NEW.is_finished) THEN
    FOR rec IN
      SELECT pm.user_id
      FROM public.match_teams mt
      JOIN public.pelada_members pm ON pm.id = mt.pelada_member_id
      WHERE mt.match_id = NEW.id AND pm.user_id IS NOT NULL
    LOOP
      PERFORM public.award_xp(rec.user_id, 'match_played', 20, 'match', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_xp_match_finish ON public.matches;
CREATE TRIGGER trg_xp_match_finish
AFTER UPDATE OF is_finished ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.xp_on_match_finish();

-- Award results (craque / fair play) XP
CREATE OR REPLACE FUNCTION public.xp_on_award_result()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid;
  bonus int;
BEGIN
  SELECT user_id INTO uid FROM public.pelada_members WHERE id = NEW.winner_member_id;
  IF uid IS NULL THEN RETURN NEW; END IF;
  bonus := CASE NEW.award_type
    WHEN 'craque' THEN 50
    WHEN 'fair_play' THEN 30
    ELSE 0 END;
  IF bonus > 0 THEN
    PERFORM public.award_xp(uid, 'award_' || NEW.award_type, bonus, 'match', NEW.match_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_xp_award ON public.pelada_award_results;
CREATE TRIGGER trg_xp_award
AFTER INSERT ON public.pelada_award_results
FOR EACH ROW EXECUTE FUNCTION public.xp_on_award_result();

-- ============ LIMIT 2 CO-ADMINS PER PELADA ============
CREATE OR REPLACE FUNCTION public.enforce_admin_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  creator uuid;
  admin_count int;
BEGIN
  IF NEW.role <> 'admin' THEN RETURN NEW; END IF;

  SELECT created_by INTO creator FROM public.peladas WHERE id = NEW.pelada_id;
  IF NEW.user_id = creator THEN RETURN NEW; END IF; -- president always allowed

  SELECT COUNT(*) INTO admin_count
  FROM public.pelada_members pm
  WHERE pm.pelada_id = NEW.pelada_id
    AND pm.role = 'admin'
    AND pm.user_id <> creator
    AND pm.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF admin_count >= 2 THEN
    RAISE EXCEPTION 'Limite de 2 admins auxiliares por pelada atingido';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_admin_limit ON public.pelada_members;
CREATE TRIGGER trg_admin_limit
BEFORE INSERT OR UPDATE OF role ON public.pelada_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_limit();
