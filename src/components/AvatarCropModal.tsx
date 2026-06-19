import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PlayerCardEAFC } from "@/components/PlayerCardEAFC";
import { Loader2, ZoomIn, ZoomOut, Move, Check, X } from "lucide-react";

interface AvatarCropModalProps {
  open: boolean;
  onClose: () => void;
  imageFile: File | null;
  onSave: (croppedBlob: Blob) => Promise<void>;
  playerName: string;
  username?: string;
  position: string;
  overall: number;
  rarity: "bronze" | "prata" | "ouro" | "ouro_raro" | "roxo" | "azul";
}

export function AvatarCropModal({
  open, onClose, imageFile, onSave,
  playerName, username, position, overall, rarity,
}: AvatarCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load image when file changes
  useEffect(() => {
    if (!imageFile) { setImageSrc(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Preload image element for canvas rendering
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => { imgRef.current = img; };
  }, [imageSrc]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  // Build the cropped image URL for the card preview
  const previewStyle: React.CSSProperties = imageSrc ? {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: `${zoom * 100}%`,
    backgroundPosition: `calc(50% + ${offset.x}px) calc(50% + ${offset.y}px)`,
    backgroundRepeat: "no-repeat",
  } : {};

  // Generate a preview data URL for the card
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageSrc) { setPreviewUrl(null); return; }
    // Debounce canvas render
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas || !imgRef.current) return;
      const img = imgRef.current;
      const size = 400;
      canvas.width = size;
      canvas.height = Math.round(size * 1.5); // card aspect ~2:3
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // Calculate draw dimensions
      const scale = zoom;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = cw / ch;

      let drawW: number, drawH: number;
      if (imgAspect > canvasAspect) {
        drawH = ch * scale;
        drawW = drawH * imgAspect;
      } else {
        drawW = cw * scale;
        drawH = drawW / imgAspect;
      }

      const drawX = (cw - drawW) / 2 + offset.x * (cw / 240);
      const drawY = (ch - drawH) / 2 + offset.y * (ch / 360);

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      setPreviewUrl(canvas.toDataURL("image/jpeg", 0.92));
    }, 50);
    return () => clearTimeout(timer);
  }, [imageSrc, zoom, offset]);

  const handleSave = async () => {
    if (!canvasRef.current) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasRef.current!.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas empty"))),
          "image/jpeg",
          0.92
        );
      });
      await onSave(blob);
    } catch (err: any) {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl w-[95vw] bg-card border-border p-0 overflow-hidden flex flex-col gap-0 max-h-[100dvh] sm:max-h-[90vh] h-[100dvh] sm:h-auto rounded-none sm:rounded-lg"
      >
        <DialogHeader className="p-4 pb-2 border-b border-border/40 shrink-0">
          <DialogTitle className="font-display text-lg">Ajustar foto da carta</DialogTitle>
        </DialogHeader>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="flex flex-col md:flex-row gap-4 p-4">
            {/* Left: Image adjustment area */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              <div
                className="relative w-full max-w-[260px] sm:max-w-none mx-auto aspect-[2/3] rounded-lg overflow-hidden border border-border/50 cursor-grab active:cursor-grabbing select-none touch-none"
                style={previewStyle}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {!imageSrc && (
                  <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
                    <p className="text-muted-foreground text-sm">Nenhuma imagem</p>
                  </div>
                )}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background/70 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] text-muted-foreground pointer-events-none">
                  <Move className="w-3 h-3" /> Arraste para reposicionar
                </div>
              </div>

              {/* Zoom control */}
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Slider
                  value={[zoom]}
                  onValueChange={([v]) => setZoom(v)}
                  min={0.5}
                  max={3}
                  step={0.05}
                  className="flex-1"
                />
                <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>

            {/* Right: Live card preview - hidden on mobile to save space */}
            <div className="hidden md:flex flex-col items-center gap-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Preview da carta</p>
              <PlayerCardEAFC
                name={playerName}
                username={username}
                position={position}
                overall={overall}
                rarity={rarity}
                avatarUrl={previewUrl}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Sticky action bar */}
        <div
          className="shrink-0 flex items-center justify-end gap-2 p-3 border-t border-border/40 bg-card"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <Button variant="ghost" onClick={onClose} disabled={saving} className="min-h-11">
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !imageSrc} className="glow-primary min-h-11">
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Salvando...</>
            ) : (
              <><Check className="w-4 h-4 mr-1" /> Salvar foto</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
