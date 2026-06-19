import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, PlayerCard } from "@/hooks/useProfile";

export function useProfileByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!userId,
  });
}

export function usePlayerCardByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: ["playerCard", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_cards")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as PlayerCard | null;
    },
    enabled: !!userId,
  });
}
