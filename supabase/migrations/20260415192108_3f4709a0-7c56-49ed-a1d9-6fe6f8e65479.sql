
-- Drop the old overly-permissive policy
DROP POLICY IF EXISTS "Members can view own payments" ON public.pelada_payments;

-- Admins see all payments in their peladas
CREATE POLICY "Admins can view all payments"
  ON public.pelada_payments
  FOR SELECT
  TO authenticated
  USING (is_pelada_admin(auth.uid(), pelada_id));

-- Players can only see their own payment rows
CREATE POLICY "Members can view only own payments"
  ON public.pelada_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pelada_members pm
      WHERE pm.id = pelada_payments.pelada_member_id
        AND pm.user_id = auth.uid()
    )
  );
