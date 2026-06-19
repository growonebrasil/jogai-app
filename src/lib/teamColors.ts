export const TEAM_COLOR_NAMES = [
  "Branco", "Vermelho", "Amarelo", "Preto",
  "Azul", "Verde", "Laranja", "Rosa", "Roxo", "Cinza",
];

export const TEAM_COLOR_STYLES: Record<string, { dot: string; border: string; bg: string }> = {
  Branco:    { dot: "bg-white border border-gray-400",        border: "border-gray-300",       bg: "bg-white/5" },
  Vermelho:  { dot: "bg-red-500",                             border: "border-red-500/40",     bg: "bg-red-500/5" },
  Amarelo:   { dot: "bg-yellow-400",                          border: "border-yellow-400/40",  bg: "bg-yellow-400/5" },
  Preto:     { dot: "bg-gray-900 border border-gray-600",     border: "border-gray-700",       bg: "bg-gray-900/10" },
  Azul:      { dot: "bg-blue-500",                            border: "border-blue-500/40",    bg: "bg-blue-500/5" },
  Verde:     { dot: "bg-green-500",                           border: "border-green-500/40",   bg: "bg-green-500/5" },
  Laranja:   { dot: "bg-orange-500",                          border: "border-orange-500/40",  bg: "bg-orange-500/5" },
  Rosa:      { dot: "bg-pink-500",                            border: "border-pink-500/40",    bg: "bg-pink-500/5" },
  Roxo:      { dot: "bg-purple-500",                          border: "border-purple-500/40",  bg: "bg-purple-500/5" },
  Cinza:     { dot: "bg-gray-400",                            border: "border-gray-400/40",    bg: "bg-gray-400/5" },
};

export function getTeamStyle(teamName: string) {
  return TEAM_COLOR_STYLES[teamName] || { dot: "bg-primary", border: "border-primary/40", bg: "bg-primary/5" };
}

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

/**
 * Derives the technical team letter ("Time A", "Time B"...) from its index
 * in the sorted regular teams list. Used for display only — the underlying
 * DB name remains the color (e.g. "Branco") for backward compatibility.
 */
export function teamLetter(index: number): string {
  return LETTERS[index] || `${index + 1}`;
}

/** Display label: "Time A · Branco" */
export function teamDisplayLabel(name: string, index: number): string {
  if (name === "De Fora") return "De Fora";
  return `Time ${teamLetter(index)} · ${name}`;
}

/** Short label: "Time A" */
export function teamShortLabel(name: string, index: number): string {
  if (name === "De Fora") return "De Fora";
  return `Time ${teamLetter(index)}`;
}
