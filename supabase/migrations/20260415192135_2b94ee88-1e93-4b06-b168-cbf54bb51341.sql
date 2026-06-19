
-- Restrict expenses to admin-only view
DROP POLICY IF EXISTS "Members can view expenses" ON public.pelada_expenses;

CREATE POLICY "Only admins can view expenses"
  ON public.pelada_expenses
  FOR SELECT
  TO authenticated
  USING (is_pelada_admin(auth.uid(), pelada_id));

-- Restrict income to admin-only view
DROP POLICY IF EXISTS "Members can view income" ON public.pelada_income;

CREATE POLICY "Only admins can view income"
  ON public.pelada_income
  FOR SELECT
  TO authenticated
  USING (is_pelada_admin(auth.uid(), pelada_id));
