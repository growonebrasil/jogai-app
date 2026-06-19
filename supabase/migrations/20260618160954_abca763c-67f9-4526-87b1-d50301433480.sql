
-- 1) profiles: revoke column SELECT on sensitive fields
REVOKE SELECT (phone, stripe_customer_id, stripe_subscription_id) ON public.profiles FROM authenticated;
REVOKE SELECT (phone, stripe_customer_id, stripe_subscription_id) ON public.profiles FROM anon;
-- service_role keeps full access via GRANT ALL elsewhere

-- Allow user to read their own private profile fields via SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS TABLE (phone text, stripe_customer_id text, stripe_subscription_id text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone, stripe_customer_id, stripe_subscription_id
  FROM public.profiles
  WHERE user_id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;

-- 2) peladas.pix_key: revoke column SELECT; force access via get_pelada_pix_key
REVOKE SELECT (pix_key) ON public.peladas FROM authenticated;
REVOKE SELECT (pix_key) ON public.peladas FROM anon;

-- 3) player_card_history: own rows only
DROP POLICY IF EXISTS "Anyone authenticated can view card history" ON public.player_card_history;
CREATE POLICY "Users can view their own card history"
  ON public.player_card_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4) player_milestones: own rows only
DROP POLICY IF EXISTS "Authenticated can view milestones" ON public.player_milestones;
CREATE POLICY "Users can view their own milestones"
  ON public.player_milestones
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5) player_xp: own rows only
DROP POLICY IF EXISTS "Authenticated can view XP" ON public.player_xp;
CREATE POLICY "Users can view their own XP"
  ON public.player_xp
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 6) reward_unlocks: no client-side INSERT (only triggers/SECURITY DEFINER functions via service_role)
DROP POLICY IF EXISTS "Users can unlock own rewards" ON public.reward_unlocks;
REVOKE INSERT ON public.reward_unlocks FROM authenticated;
REVOKE INSERT ON public.reward_unlocks FROM anon;
