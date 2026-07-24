import type { Innings, Match } from "@/types";

export function sumCricketRuns(innings: Innings[] | undefined): number {
  if (!innings) return 0;
  return innings.reduce((sum, i) => sum + (i.runs ?? 0), 0);
}

export function formatOvers(overs: number | undefined): string {
  if (overs == null) return "";
  return `${overs} Overs`;
}

export function formatCricketScore(
  runs: number | null | undefined,
  wickets: number | null | undefined,
): string {
  if (runs == null) return "—";
  if (wickets == null) return `${runs}`;
  return `${runs}/${wickets}`;
}

export function getTeamAbbr(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function formatMatchType(type: string | null | undefined): string {
  if (!type) return "";
  const t = type.toLowerCase();
  if (t === "t20") return "T20";
  if (t === "odi") return "ODI";
  if (t === "test") return "Test";
  if (t === "hun") return "The Hundred";
  return type.toUpperCase();
}


export function formatMatchStatus(match: Match): string {
  if (match.status === "live") {
    if (match.sport === "cricket") {
      const last = match.metadata?.innings?.[match.metadata.innings.length - 1];
      if (last) return `${last.overs} Overs`;
      return "In progress";
    }
    if (match.sport === "football") {
      const minute = match.metadata?.minute;
      if (minute != null) return `${minute}'`;
      return "In progress";
    }
    return "In progress";
  }
  if (match.status === "scheduled") {
    try {
      const d = new Date(match.startTime);
      return d.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return match.startTime;
    }
  }
  return "Full time";
}
