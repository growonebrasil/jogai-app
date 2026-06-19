
-- Add financial fields to peladas
ALTER TABLE public.peladas
  ADD COLUMN IF NOT EXISTS fee_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fee_due_day integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pix_key text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fee_type text DEFAULT 'monthly';

-- Pelada expenses table
CREATE TABLE public.pelada_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  category text NOT NULL,
  amount numeric NOT NULL,
  description text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pelada_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expenses" ON public.pelada_expenses FOR ALL
  USING (is_pelada_admin(auth.uid(), pelada_id));
CREATE POLICY "Members can view expenses" ON public.pelada_expenses FOR SELECT
  USING (is_pelada_member(auth.uid(), pelada_id));

-- Pelada income table
CREATE TABLE public.pelada_income (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  category text NOT NULL,
  amount numeric NOT NULL,
  description text,
  income_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pelada_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage income" ON public.pelada_income FOR ALL
  USING (is_pelada_admin(auth.uid(), pelada_id));
CREATE POLICY "Members can view income" ON public.pelada_income FOR SELECT
  USING (is_pelada_member(auth.uid(), pelada_id));

-- Player payment tracking per pelada per month
CREATE TABLE public.pelada_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  pelada_member_id uuid NOT NULL REFERENCES public.pelada_members(id) ON DELETE CASCADE,
  reference_month date NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pelada_id, pelada_member_id, reference_month)
);
ALTER TABLE public.pelada_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payments" ON public.pelada_payments FOR ALL
  USING (is_pelada_admin(auth.uid(), pelada_id));
CREATE POLICY "Members can view own payments" ON public.pelada_payments FOR SELECT
  USING (is_pelada_member(auth.uid(), pelada_id));

-- Trigger for updated_at
CREATE TRIGGER update_pelada_payments_updated_at
  BEFORE UPDATE ON public.pelada_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
