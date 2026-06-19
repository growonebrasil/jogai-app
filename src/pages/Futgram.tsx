import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Plus, Loader2, Send } from "lucide-react";
import { useFeedPostsByType, useToggleLike, usePostComments, useAddComment, type FeedPost } from "@/hooks/useFeed";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { CardPostTemplate, isCardPost } from "@/components/CardPostTemplate";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function MediaPostCard({ post }: { post: FeedPost }) {
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
    <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/60 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => navigate(`/jogadores/${post.user_id}`)}
      >
        <div className="w-11 h-11 rounded-full overflow-hidden bg-secondary border-2 border-primary/20 shrink-0">
          {post.profile?.avatar_url ? (
            <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary font-bold text-sm">
              {post.profile?.name?.charAt(0) || "?"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm text-foreground truncate hover:text-primary transition-colors">{post.profile?.name}</p>
          <p className="text-xs text-muted-foreground">
            {post.profile?.username ? `@${post.profile.username}` : ""} ·{" "}
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pb-3">
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
        </div>
      )}

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className={post.media_urls.length === 1 ? "" : "grid grid-cols-3 gap-0.5"}>
          {post.media_type === "video" ? (
            <video src={post.media_urls[0]} controls className="w-full max-h-[500px] object-contain bg-black" />
          ) : (
            post.media_urls.map((url, i) => (
              <div key={i} className="aspect-square">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-5 px-4 py-3 border-t border-border/40">
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

export default function Futgram() {
  const { data: posts, isLoading } = useFeedPostsByType("media");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <AppLayout>
      <div className="min-h-full" style={{ background: "linear-gradient(180deg, hsl(214 25% 10%) 0%, hsl(214 28% 8%) 100%)" }}>
        <div className="max-w-xl mx-auto p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Futgram</h1>
              <p className="text-xs text-muted-foreground">Fotos e vídeos do futebol</p>
            </div>
            <Button size="sm" className="glow-primary" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Publicar
            </Button>
          </div>

          <CreatePostDialog open={dialogOpen} onOpenChange={setDialogOpen} mediaOnly />

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts && posts.filter(p => p.media_type !== "text" && p.media_urls && p.media_urls.length > 0).length > 0 ? (
            <div className="space-y-4">
              {posts.filter(p => p.media_type !== "text" && p.media_urls && p.media_urls.length > 0).map((post) =>
                isCardPost(post) ? <CardPostTemplate key={post.id} post={post} /> : <MediaPostCard key={post.id} post={post} />
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-card/60 backdrop-blur-sm rounded-xl border border-border/40">
              <p className="text-muted-foreground mb-4">Nenhuma publicação ainda</p>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Criar primeira publicação
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
