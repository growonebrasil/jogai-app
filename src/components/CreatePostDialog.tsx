import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Image as ImageIcon, Video, Type, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatePost } from "@/hooks/useFeed";

type PostType = "text" | "photo" | "video";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaOnly?: boolean;
}

export function CreatePostDialog({ open, onOpenChange, mediaOnly }: CreatePostDialogProps) {
  const { user } = useAuth();
  const createPost = useCreatePost();
  const [postType, setPostType] = useState<PostType | null>(null);
  const [caption, setCaption] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPostType(null);
    setCaption("");
    setMediaFiles([]);
    mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    setMediaPreviews([]);
    setUploading(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (postType === "photo") {
      const valid = files.filter((f) => f.type.startsWith("image/"));
      if (valid.length === 0) { toast.error("Selecione apenas imagens"); return; }
      const selected = valid.slice(0, 3);
      setMediaFiles(selected);
      setMediaPreviews(selected.map((f) => URL.createObjectURL(f)));
    } else if (postType === "video") {
      const valid = files.filter((f) => f.type.startsWith("video/"));
      if (valid.length === 0) { toast.error("Selecione um arquivo de vídeo"); return; }
      if (valid[0].size > 50 * 1024 * 1024) { toast.error("Vídeo máximo de 50MB"); return; }
      setMediaFiles([valid[0]]);
      setMediaPreviews([URL.createObjectURL(valid[0])]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index]);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (): Promise<string[]> => {
    if (!user || mediaFiles.length === 0) return [];
    const urls: string[] = [];
    for (const file of mediaFiles) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("feed_media").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("feed_media").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handlePublish = async () => {
    if (!postType) return;
    if (postType === "text" && !caption.trim()) {
      toast.error("Escreva algo para publicar");
      return;
    }
    if ((postType === "photo" || postType === "video") && mediaFiles.length === 0) {
      toast.error(postType === "photo" ? "Selecione ao menos uma foto" : "Selecione um vídeo");
      return;
    }

    setUploading(true);
    try {
      let mediaUrls: string[] = [];
      if (mediaFiles.length > 0) {
        mediaUrls = await uploadMedia();
      }
      const mediaType = postType === "video" ? "video" : postType === "text" ? "text" : "photo";
      await createPost.mutateAsync({ caption: caption.trim(), mediaUrls, mediaType });
      toast.success("Publicação criada!");
      handleClose(false);
    } catch {
      toast.error("Erro ao publicar. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const isSubmitting = uploading || createPost.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Nova Publicação</DialogTitle>
        </DialogHeader>

        {/* Type selector */}
        {!postType && (
          <div className={`grid ${mediaOnly ? "grid-cols-2" : "grid-cols-3"} gap-3 py-4`}>
            {!mediaOnly && (
              <button
                onClick={() => setPostType("text")}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
              >
                <Type className="w-8 h-8 text-primary" />
                <span className="text-sm font-semibold text-foreground">Texto</span>
              </button>
            )}
            <button
              onClick={() => setPostType("photo")}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <ImageIcon className="w-8 h-8 text-primary" />
              <span className="text-sm font-semibold text-foreground">Foto</span>
            </button>
            <button
              onClick={() => setPostType("video")}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Video className="w-8 h-8 text-primary" />
              <span className="text-sm font-semibold text-foreground">Vídeo</span>
            </button>
          </div>
        )}

        {/* Post form */}
        {postType && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => { setPostType(null); setMediaFiles([]); setMediaPreviews([]); }}>
              ← Voltar
            </Button>

            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={
                postType === "text"
                  ? "O que está acontecendo no seu futebol?"
                  : "Adicione uma legenda..."
              }
              className="bg-secondary/30 border-border min-h-[100px]"
              maxLength={500}
            />

            {/* Photo upload */}
            {postType === "photo" && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {mediaPreviews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaPreviews.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-secondary/30">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeMedia(i)}
                          className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {mediaPreviews.length < 3 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors"
                      >
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 rounded-lg border-2 border-dashed border-border flex flex-col items-center gap-2 hover:border-primary transition-colors"
                  >
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique para selecionar fotos (até 3)</span>
                  </button>
                )}
              </div>
            )}

            {/* Video upload */}
            {postType === "video" && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {mediaPreviews.length > 0 ? (
                  <div className="relative rounded-lg overflow-hidden bg-secondary/30">
                    <video src={mediaPreviews[0]} controls className="w-full max-h-64 object-contain" />
                    <button
                      onClick={() => removeMedia(0)}
                      className="absolute top-2 right-2 bg-background/80 rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 rounded-lg border-2 border-dashed border-border flex flex-col items-center gap-2 hover:border-primary transition-colors"
                  >
                    <Video className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique para selecionar um vídeo (máx 50MB)</span>
                  </button>
                )}
              </div>
            )}

            <Button
              onClick={handlePublish}
              disabled={isSubmitting}
              className="w-full glow-primary"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</>
              ) : (
                "Publicar"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
