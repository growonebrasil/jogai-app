import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Plus, Loader2, Send } from "lucide-react";
import { useFeedPostsByType, useToggleLike, usePostComments, useAddComment, useCreatePost, type FeedPost } from "@/hooks/useFeed";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

function TweetCard({ post }: { post: FeedPost }) {
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

  return (
    <div className="bg-card/95 backdrop-blur-sm border-b border-border/40 px-4 py-4 hover:bg-card/80 transition-colors">
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full overflow-hidden bg-secondary border border-primary/20 shrink-0 cursor-pointer"
          onClick={() => navigate(`/jogadores/${post.user_id}`)}
        >
          {post.profile?.avatar_url ? (
            <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary font-bold text-sm">
              {post.profile?.name?.charAt(0) || "?"}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="font-bold text-sm text-foreground hover:text-primary cursor-pointer transition-colors"
              onClick={() => navigate(`/jogadores/${post.user_id}`)}
            >
              {post.profile?.name}
            </span>
            {post.profile?.username && (
              <span className="text-muted-foreground text-sm">@{post.profile.username}</span>
            )}
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>

          <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap leading-relaxed">{post.caption}</p>

          {/* Actions */}
          <div className="flex items-center gap-6 mt-3">
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group">
              <MessageCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span>{post.comments_count}</span>
            </button>
            <button onClick={handleLike} className="flex items-center gap-1.5 text-sm transition-colors hover:text-destructive group">
              <Heart className={`w-4 h-4 transition-transform group-hover:scale-110 ${post.liked_by_me ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
              <span className="text-muted-foreground">{post.likes_count}</span>
            </button>
          </div>

          {/* Comments */}
          {showComments && (
            <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
              {comments?.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-secondary shrink-0 flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden border border-border/40">
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
                  placeholder="Responder..."
                  className="h-7 text-xs bg-card/80 border-border/50"
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                />
                <Button size="sm" variant="ghost" onClick={handleComment} disabled={addComment.isPending} className="h-7 px-2">
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Fuwitter() {
  const { data: posts, isLoading } = useFeedPostsByType("text");
  const createPost = useCreatePost();
  const [newTweet, setNewTweet] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!newTweet.trim()) return;
    setPosting(true);
    try {
      await createPost.mutateAsync({ caption: newTweet.trim(), mediaUrls: [], mediaType: "text" });
      setNewTweet("");
      toast.success("Publicado no Fuwitter!");
    } catch (err: any) {
      console.error("Fuwitter post error:", err);
      const msg = err?.message || "Erro desconhecido";
      if (msg.includes("row-level security")) {
        toast.error("Você precisa estar logado para publicar.");
      } else {
        toast.error("Erro ao publicar: " + msg);
      }
    } finally {
      setPosting(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-full" style={{ background: "linear-gradient(180deg, hsl(214 25% 10%) 0%, hsl(214 28% 8%) 100%)" }}>
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border/40 px-4 py-3">
            <h1 className="font-display text-xl font-bold text-foreground">Fuwitter</h1>
            <p className="text-xs text-muted-foreground">O que está rolando no futebol</p>
          </div>

          {/* Compose */}
          <div className="p-4 border-b border-border/40">
            <Textarea
              value={newTweet}
              onChange={(e) => setNewTweet(e.target.value)}
              placeholder="O que está acontecendo no seu futebol?"
              className="bg-transparent border-none resize-none focus-visible:ring-0 text-sm min-h-[60px] p-0"
              maxLength={280}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">{newTweet.length}/280</span>
              <Button
                size="sm"
                onClick={handlePost}
                disabled={posting || !newTweet.trim()}
                className="glow-primary rounded-full px-5"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Postar"}
              </Button>
            </div>
          </div>

          {/* Feed */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts && posts.length > 0 ? (
            <div>
              {posts.map((post) => <TweetCard key={post.id} post={post} />)}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground text-sm">Nenhum post ainda. Seja o primeiro!</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
