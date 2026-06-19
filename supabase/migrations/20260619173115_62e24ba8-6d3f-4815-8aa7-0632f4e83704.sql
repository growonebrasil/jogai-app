DROP POLICY IF EXISTS "Members can update own non-privileged fields" ON public.pelada_members;

CREATE POLICY "Members can update own non-privileged fields"
ON public.pelada_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT pm.role FROM public.pelada_members pm WHERE pm.id = pelada_members.id)
  AND user_id = (SELECT pm.user_id FROM public.pelada_members pm WHERE pm.id = pelada_members.id)
  AND pelada_id = (SELECT pm.pelada_id FROM public.pelada_members pm WHERE pm.id = pelada_members.id)
);