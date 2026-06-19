import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SearchPlayer {
  id: string;
  user_id: string;
  name: string;
  username: string | null;
  position: string;
  avatar_url: string | null;
  user_role: string;
  birth_date: string | null;
  dominant_foot: string | null;
  city: string | null;
  player_cards: {
    overall: number;
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
    rarity: string;
  } | null;
}

export function useSearchPlayers(search: string, positionFilter: string) {
  return useQuery({
    queryKey: ["searchPlayers", search, positionFilter],
    queryFn: async () => {
      // 1. Fetch profiles
      // Show ALL users (players + presidents with player profile)
      let query = supabase
        .from("profiles")
        .select("id, user_id, name, username, position, avatar_url, user_role, birth_date, dominant_foot, city")
        .order("name");

      if (positionFilter && positionFilter !== "all") {
        query = query.eq("position", positionFilter as any);
      }

      if (search.trim()) {
        // Strip leading @ for username searches
        const cleaned = search.trim().replace(/^@/, "");
        const term = `%${cleaned}%`;
        query = query.or(`name.ilike.${term},username.ilike.${term}`);
      }

      const { data: profiles, error } = await query.limit(50);
      if (error) throw error;
      if (!profiles || profiles.length === 0) return [] as SearchPlayer[];

      // 2. Fetch player_cards for all returned user_ids
      const userIds = profiles.map((p: any) => p.user_id);
      const { data: cards } = await supabase
        .from("player_cards")
        .select("user_id, overall, pace, shooting, passing, dribbling, defending, physical, rarity")
        .in("user_id", userIds);

      const cardMap = new Map<string, any>();
      (cards || []).forEach((c: any) => cardMap.set(c.user_id, c));

      return profiles.map((p: any) => ({
        ...p,
        player_cards: cardMap.get(p.user_id) || null,
      })) as SearchPlayer[];
    },
  });
}
