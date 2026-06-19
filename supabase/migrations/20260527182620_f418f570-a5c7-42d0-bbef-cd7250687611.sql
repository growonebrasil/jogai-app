
-- 1. profiles: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- 2. peladas: hide pix_key from anon and non-members
REVOKE SELECT (pix_key) ON public.peladas FROM anon;
REVOKE SELECT (pix_key) ON public.peladas FROM authenticated;
GRANT SELECT (
  id, created_by, name, description, location, scheduled_date, scheduled_time,
  pelada_type, max_players, is_active, created_at, updated_at, location_name,
  full_address, latitude, longitude, recurrence_type, recurrence_day_of_week,
  recurrence_interval, recurrence_enabled, match_id_code, neighborhood, city,
  is_paid, is_live, fee_amount, fee_due_day, fee_type
) ON public.peladas TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_pelada_pix_key(_pelada_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.pix_key
  FROM public.peladas p
  WHERE p.id = _pelada_id
    AND public.is_pelada_member(auth.uid(), _pelada_id)
$$;
REVOKE EXECUTE ON FUNCTION public.get_pelada_pix_key(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_pelada_pix_key(uuid) TO authenticated;

-- 3. player_xp
DROP POLICY IF EXISTS "XP viewable by everyone" ON public.player_xp;
DROP POLICY IF EXISTS "Users can insert own XP" ON public.player_xp;
DROP POLICY IF EXISTS "Users can update own XP" ON public.player_xp;
CREATE POLICY "Authenticated can view XP"
ON public.player_xp FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.player_xp FROM anon, authenticated;

-- 4. player_milestones
DROP POLICY IF EXISTS "Milestones viewable by everyone" ON public.player_milestones;
DROP POLICY IF EXISTS "Users can insert own milestones" ON public.player_milestones;
CREATE POLICY "Authenticated can view milestones"
ON public.player_milestones FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.player_milestones FROM anon, authenticated;

-- 5. reward_unlocks
DROP POLICY IF EXISTS "Reward unlocks viewable by everyone" ON public.reward_unlocks;
CREATE POLICY "Users view own reward unlocks"
ON public.reward_unlocks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 6. Revoke EXECUTE on award_xp (any signature) from clients
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'award_xp'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, authenticated, public', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- 7. Storage: restrict listing to authenticated
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view feed media" ON storage.objects;
CREATE POLICY "Authenticated can list avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated can list feed media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'feed_media');
