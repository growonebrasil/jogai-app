DROP POLICY IF EXISTS "Users can join peladas" ON public.pelada_members;

CREATE POLICY "Users can join peladas"
ON public.pelada_members
FOR INSERT
TO authenticated
WITH CHECK (
  (
    auth.uid() = user_id
    AND role <> 'admin'
  )
  OR public.is_pelada_admin(auth.uid(), pelada_id)
);