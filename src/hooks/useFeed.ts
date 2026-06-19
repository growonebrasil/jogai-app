import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FeedPost {
  id: string;
  user_id: string;
  caption: string | null;
  media_urls: string[];
  media_type: string;
  city: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profile?: {
    name: string;
    username: string | null;
    avatar_url: string | null;
    city: string | null;
  };
  liked_by_me?: boolean;
}

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    name: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export function useFeedPosts() {
  return useFeedPostsByType("all");
}

export function useFeedPostsByType(type: "text" | "media" | "all" = "all") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["feed-posts", type],
    queryFn: async () => {
      // Get user profile for geographic distribution
      let userCity: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("city")
          .eq("user_id", user.id)
          .maybeSingle();
        userCity = profile?.city || null;
      }

      let query = supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (type === "text") {
        query = query.eq("media_type", "text");
      } else if (type === "media") {
        query = query.neq("media_type", "text");
      }

      const { data: posts, error } = await query;

      if (error) throw error;

      // Get profiles for each post
      const userIds = [...new Set((posts || []).map((p: any) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, username, avatar_url, city")
        .in("user_id", userIds);

      // Check which posts are liked by current user
      let likedPostIds: string[] = [];
      if (user) {
        const { data: likes } = await supabase
          .from("feed_likes")
          .select("post_id")
          .eq("user_id", user.id);
        likedPostIds = (likes || []).map((l: any) => l.post_id);
      }

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Simple geographic scoring
      const enriched = (posts || []).map((post: any) => ({
        ...post,
        profile: profileMap.get(post.user_id) || { name: "Jogador", username: null, avatar_url: null, city: null },
        liked_by_me: likedPostIds.includes(post.id),
      }));

      // Sort: same city first, then by likes, then by recency
      if (userCity) {
        enriched.sort((a: any, b: any) => {
          const aCity = a.city === userCity ? 1 : 0;
          const bCity = b.city === userCity ? 1 : 0;
          if (aCity !== bCity) return bCity - aCity;
          if (a.likes_count !== b.likes_count) return b.likes_count - a.likes_count;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }

      return enriched as FeedPost[];
    },
    enabled: !!user,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      caption,
      mediaUrls,
      mediaType,
    }: {
      caption: string;
      mediaUrls: string[];
      mediaType: "photo" | "video" | "text";
    }) => {
      // Get user city
      let city: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("city")
          .eq("user_id", user.id)
          .maybeSingle();
        city = profile?.city || null;
      }

      const { error } = await supabase.from("feed_posts").insert({
        user_id: user!.id,
        caption,
        media_urls: mediaUrls,
        media_type: mediaType,
        city,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        await supabase.from("feed_likes").delete().eq("post_id", postId).eq("user_id", user!.id);
      } else {
        await supabase.from("feed_likes").insert({ post_id: postId, user_id: user!.id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

export function usePostComments(postId: string | null) {
  return useQuery({
    queryKey: ["feed-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_comments")
        .select("*")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return (data || []).map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id) || { name: "Jogador", username: null, avatar_url: null },
      })) as FeedComment[];
    },
    enabled: !!postId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const { error } = await supabase.from("feed_comments").insert({
        post_id: postId,
        user_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["feed-comments", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useUserPosts(userId?: string) {
  return useQuery({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_posts")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FeedPost[];
    },
    enabled: !!userId,
  });
}
