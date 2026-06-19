import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ["followCounts", userId],
    queryFn: async () => {
      if (!userId) return { followers: 0, following: 0 };

      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
      ]);

      return { followers: followers || 0, following: following || 0 };
    },
    enabled: !!userId,
  });
}

export function useIsFollowing(targetUserId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["isFollowing", user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId || user.id === targetUserId) return false;

      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      return !!data;
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });
}

export function useToggleFollow() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId, isFollowing }: { targetUserId: string; isFollowing: boolean }) => {
      if (!user) throw new Error("Não autenticado");
      if (user.id === targetUserId) throw new Error("Não pode seguir a si mesmo");

      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: targetUserId });
        if (error) throw error;
      }
    },
    onSuccess: (_, { targetUserId, isFollowing }) => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["followCounts"] });
      toast.success(isFollowing ? "Deixou de seguir" : "Seguindo!");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });
}
