import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { CalendarX, Loader2 } from "lucide-react";
import { useCancelOccurrence } from "@/hooks/useOccurrences";

interface CancelOccurrenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peladaId: string;
  date: string;
}

const REASONS = [
  "Sem quórum",
  "Campo indisponível",
  "Chuva / mau tempo",
  "Outro motivo",
];

export function CancelOccurrenceDialog({ open, onOpenChange, peladaId, date }: CancelOccurrenceDialogProps) {
  const [selectedReason, setSelectedReason] = useState("Sem quórum");
  const [customReason, setCustomReason] = useState("");
  const cancelOccurrence = useCancelOccurrence();

  const handleCancel = () => {
    const reason = selectedReason === "Outro motivo" ? customReason.trim() || "Outro motivo" : selectedReason;
    cancelOccurrence.mutate(
      { peladaId, date, reason },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX className="w-5 h-5 text-destructive" />
            Pelada não aconteceu
          </DialogTitle>
          <DialogDescription>
            Marque esta pelada como cancelada. Ela ficará no histórico sem gerar estatísticas ou votação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Motivo:</Label>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((reason) => (
              <Button
                key={reason}
                variant={selectedReason === reason ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setSelectedReason(reason)}
              >
                {reason}
              </Button>
            ))}
          </div>
          {selectedReason === "Outro motivo" && (
            <Textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Descreva o motivo..."
              className="bg-secondary/50 border-border min-h-[60px]"
              maxLength={200}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelOccurrence.isPending}
          >
            {cancelOccurrence.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CalendarX className="w-4 h-4" />
            )}
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
