
CREATE OR REPLACE FUNCTION public.handle_new_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  member_user_id uuid;
  pelada_name text;
  admin_user_id uuid;
  payment_amount numeric;
BEGIN
  -- Get the member's user_id
  SELECT user_id INTO member_user_id
  FROM public.pelada_members
  WHERE id = NEW.pelada_member_id;

  -- Skip if guest (no user_id)
  IF member_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get pelada name and admin
  SELECT p.name, p.created_by INTO pelada_name, admin_user_id
  FROM public.peladas p
  WHERE p.id = NEW.pelada_id;

  -- Don't notify admin about their own charges
  IF member_user_id = admin_user_id THEN
    RETURN NEW;
  END IF;

  payment_amount := NEW.amount;

  INSERT INTO public.notifications (recipient_user_id, actor_user_id, type, message)
  VALUES (
    member_user_id,
    COALESCE(admin_user_id, member_user_id),
    'payment_created',
    'Nova cobrança de R$ ' || to_char(payment_amount, 'FM999990.00') || ' gerada na pelada ' || COALESCE(pelada_name, 'desconhecida')
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_created
  AFTER INSERT ON public.pelada_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_payment();
