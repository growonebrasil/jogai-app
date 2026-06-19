-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = recipient_user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_user_id);

CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = actor_user_id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name text;
  actor_username text;
BEGIN
  SELECT name, username INTO actor_name, actor_username
  FROM public.profiles
  WHERE user_id = NEW.follower_id;

  INSERT INTO public.notifications (recipient_user_id, actor_user_id, type, message)
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'new_follower',
    COALESCE('@' || actor_username, actor_name) || ' começou a seguir você'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_follow
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_follow();