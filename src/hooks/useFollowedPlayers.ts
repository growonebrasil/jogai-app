import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FollowedPlayer {
  id: string;
  user_id: string;
  name: string;
  username: string | null;
  position: string;
  avatar_url: string | null;
}

export function useFollowedPlayers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["followedPlayers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: follows, error: fErr } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (fErr) throw fErr;
      if (!follows || follows.length === 0) return [];

      const ids = follows.map((f) => f.following_id);
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, user_id, name, username, position, avatar_url")
        .in("user_id", ids)
        .order("name");
      if (pErr) throw pErr;
      return (profiles || []) as FollowedPlayer[];
    },
    enabled: !!user,
  });
}
