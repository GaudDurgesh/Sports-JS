import type { Sport } from "@/types";

export function getSportColor(sport: Sport | string): string {
  if (sport === "cricket") return "var(--accent-cricket)";
  if (sport === "football") return "var(--accent-football)";
  return "var(--text-secondary)";
}

export function getSportLabel(sport: Sport | string): string {
  if (sport === "cricket") return "Cricket";
  if (sport === "football") return "Football";
  return String(sport);
}
