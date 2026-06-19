import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface RecurrenceData {
  recurrence_type: "none" | "weekly" | "biweekly" | "monthly";
  recurrence_day_of_week: number | null;
  recurrence_interval: number;
  recurrence_enabled: boolean;
}

interface RecurrenceSelectorProps {
  value: RecurrenceData;
  onChange: (data: RecurrenceData) => void;
  disabled?: boolean;
}

const DAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const TYPE_LABELS: Record<string, string> = {
  none: "Não recorrente",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

export function recurrenceLabel(data: RecurrenceData): string {
  if (!data.recurrence_enabled || data.recurrence_type === "none") return "";
  const type = TYPE_LABELS[data.recurrence_type] || "";
  const day = data.recurrence_day_of_week != null ? DAY_LABELS[data.recurrence_day_of_week] : "";
  if (day) return `${type} — ${day}`;
  return type;
}

export function RecurrenceSelector({ value, onChange, disabled }: RecurrenceSelectorProps) {
  const handleTypeChange = (type: string) => {
    const isRecurrent = type !== "none";
    onChange({
      ...value,
      recurrence_type: type as RecurrenceData["recurrence_type"],
      recurrence_enabled: isRecurrent,
      recurrence_interval: type === "biweekly" ? 2 : 1,
      recurrence_day_of_week: isRecurrent ? (value.recurrence_day_of_week ?? 1) : null,
    });
  };

  const handleDayChange = (day: string) => {
    onChange({ ...value, recurrence_day_of_week: parseInt(day) });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Recorrência</Label>
        <Select
          value={value.recurrence_type}
          onValueChange={handleTypeChange}
          disabled={disabled}
        >
          <SelectTrigger className="bg-secondary/50 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Não recorrente</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="biweekly">Quinzenal</SelectItem>
            <SelectItem value="monthly">Mensal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.recurrence_enabled && value.recurrence_type !== "none" && (
        <div className="space-y-2">
          <Label>Dia da semana</Label>
          <Select
            value={String(value.recurrence_day_of_week ?? 1)}
            onValueChange={handleDayChange}
            disabled={disabled}
          >
            <SelectTrigger className="bg-secondary/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_LABELS.map((label, i) => (
                <SelectItem key={i} value={String(i)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
