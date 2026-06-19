
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, user_role, position, username, dominant_foot)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Jogador'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'user_role', '')::public.user_role, 'jogador'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'position', '')::public.player_position, 'MEI'),
    NEW.raw_user_meta_data->>'username',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'dominant_foot', '')::public.dominant_foot, 'direito')
  );
  
  INSERT INTO public.player_cards (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'player');
  
  RETURN NEW;
END;
$function$;
