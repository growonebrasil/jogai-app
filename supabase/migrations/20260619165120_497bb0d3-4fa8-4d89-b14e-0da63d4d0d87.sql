
-- 1) Prevent role/status escalation on pelada_members
DROP POLICY IF EXISTS "Users can update their own membership" ON public.pelada_members;

CREATE POLICY "Members can update own non-privileged fields"
ON public.pelada_members
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT role FROM public.pelada_members WHERE id = pelada_members.id)
  AND user_id = (SELECT user_id FROM public.pelada_members WHERE id = pelada_members.id)
  AND pelada_id = (SELECT pelada_id FROM public.pelada_members WHERE id = pelada_members.id)
);

CREATE POLICY "Admins can update any membership"
ON public.pelada_members
FOR UPDATE
TO authenticated
USING (public.is_pelada_admin(auth.uid(), pelada_id))
WITH CHECK (public.is_pelada_admin(auth.uid(), pelada_id));

-- 2) feed_media UPDATE policy: only file owner (folder = uid)
DROP POLICY IF EXISTS "Users can update own feed_media" ON storage.objects;
CREATE POLICY "Users can update own feed_media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'feed_media' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'feed_media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Revoke EXECUTE from anon/public on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_pelada_member(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_pelada_admin(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_pro_access(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pelada_pix_key(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_private_profile() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, text, integer, text, uuid) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pelada_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pelada_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_pro_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pelada_pix_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;
