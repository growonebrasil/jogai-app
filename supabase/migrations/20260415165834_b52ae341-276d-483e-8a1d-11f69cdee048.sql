CREATE POLICY "Users can delete own membership"
ON public.pelada_members
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);