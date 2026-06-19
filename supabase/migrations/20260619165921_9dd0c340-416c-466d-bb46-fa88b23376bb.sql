
-- 1) Restrict peladas creation to users with user_role = 'presidente'
DROP POLICY IF EXISTS "Authenticated users can create peladas" ON public.peladas;
DROP POLICY IF EXISTS "Presidents can create peladas" ON public.peladas;
CREATE POLICY "Presidents can create peladas"
ON public.peladas
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND user_role = 'presidente'
  )
);

-- 2) Restrict notifications INSERT to a known allow-list of types
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create allowed notifications" ON public.notifications;
CREATE POLICY "Users can create allowed notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = actor_user_id
  AND type IN (
    'new_follower',
    'pelada_invite',
    'attendance_request',
    'match_ended',
    'voting_open'
  )
);
