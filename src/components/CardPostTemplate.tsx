import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Award } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToggleLike, usePostComments, useAddComment, type FeedPost } from "@/hooks/useFeed";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CardPostTemplateProps {
  post: FeedPost;
}

export function CardPostTemplate({ post }: CardPostTemplateProps) {
  const navigate = useNavigate();
  const toggleLike = useToggleLike();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const addComment = useAddComment();
  const { data: comments } = usePostComments(showComments ? post.id : null);

  const handleLike = () => {
    toggleLike.mutate({ postId: post.id, isLiked: !!post.liked_by_me });
  };

  const handleComment = () => {
    if (!comment.trim()) return;
    addComment.mutate(
      { postId: post.id, content: comment.trim() },
      { onSuccess: () => setComment("") }
    );
  };

  // Extract info from caption
  const caption = post.caption || "";
  const overallMatch = caption.match(/Overall:\s*(\d+)/);
  const posMatch = caption.match(/📍\s*(\w+)/);
  const overall = overallMatch?.[1] || "";
  const position = posMatch?.[1] || "";

  return (
    <div className="rounded-xl overflow-hidden border border-border/40 shadow-lg">
      {/* Card hero area — dark gradient background */}
      <div
        className="relative"
        style={{
          background: "linear-gradient(160deg, #0a1a0a 0%, #0d2818 30%, #081510 60%, #050a08 100%)",
        }}
      >
        {/* Subtle stadium texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, rgba(15,169,88,0.3) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(15,169,88,0.2) 0%, transparent 50%)`,
          }}
        />

        {/* Soft glow behind card area */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(15,169,88,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Top section — player info */}
        <div className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-2">
          <div
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30 shrink-0 cursor-pointer"
            onClick={() => navigate(`/jogadores/${post.user_id}`)}
          >
            {post.profile?.avatar_url ? (
              <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold text-sm">
                {post.profile?.name?.charAt(0) || "?"}
              </div>
            )}
          </div>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => navigate(`/jogadores/${post.user_id}`)}
          >
            <p className="font-display font-bold text-sm text-white truncate">
              {post.profile?.name}
            </p>
            <div className="flex items-center gap-2 text-xs text-white/50">
              {post.profile?.username && <span>@{post.profile.username}</span>}
              {position && <span>· {position}</span>}
              {overall && <span>· ⭐ {overall}</span>}
            </div>
          </div>
          <div className="text-xs text-white/30">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
          </div>
        </div>

        {/* Card image — FULL, NO CROP */}
        <div className="relative z-10 flex justify-center px-6 py-4">
          <div
            className="relative"
            style={{
              filter: "drop-shadow(0 8px 32px rgba(15,169,88,0.2)) drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
            }}
          >
            {post.media_urls?.[0] && (
              <img
                src={post.media_urls[0]}
                alt="Player Card"
                className="w-auto h-auto max-w-full max-h-[420px] rounded-lg"
                style={{ objectFit: "contain" }}
              />
            )}
          </div>
        </div>

        {/* Official card badge */}
        <div className="relative z-10 flex justify-center pb-4">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{
              background: "rgba(15,169,88,0.12)",
              border: "1px solid rgba(15,169,88,0.25)",
              boxShadow: "0 0 16px rgba(15,169,88,0.1)",
            }}
          >
            <Award className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/80">
              Carta Oficial
            </span>
          </div>
        </div>

        {/* Bottom gradient fade into card bg */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8"
          style={{
            background: "linear-gradient(0deg, hsl(var(--card)) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Actions bar */}
      <div className="bg-card px-4 py-3 flex items-center gap-5 border-t border-border/20">
        <button onClick={handleLike} className="flex items-center gap-1.5 text-sm transition-colors hover:text-primary group">
          <Heart className={`w-5 h-5 transition-transform group-hover:scale-110 ${post.liked_by_me ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
          <span className="text-muted-foreground font-medium">{post.likes_count}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group">
          <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="font-medium">{post.comments_count}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-border/40 px-4 py-3 space-y-3 bg-secondary/20">
          {comments?.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-secondary shrink-0 flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden border border-border/40">
                {c.profile?.avatar_url ? (
                  <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  c.profile?.name?.charAt(0) || "?"
                )}
              </div>
              <div>
                <p className="text-xs">
                  <span className="font-bold text-foreground">{c.profile?.name}</span>{" "}
                  <span className="text-muted-foreground">{c.content}</span>
                </p>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comentar..."
              className="h-8 text-xs bg-card/80 border-border/50"
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
            />
            <Button size="sm" variant="ghost" onClick={handleComment} disabled={addComment.isPending}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Detect if a post is a card share based on its caption */
export function isCardPost(post: FeedPost): boolean {
  return !!(post.caption?.includes("Minha carta JOGA.I") || post.caption?.includes("Carta JOGA.I"));
}
