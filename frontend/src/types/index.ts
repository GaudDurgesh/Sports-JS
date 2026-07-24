export type Sport = "cricket" | "football";
export type MatchStatus = "live" | "scheduled" | "finished";

export interface Innings {
  label: string;
  runs: number;
  wickets: number;
  overs: number;
}

export interface BattingRow {
  player: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

export interface BowlingRow {
  bowler: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface ScorecardInnings {
  label: string;
  batting?: BattingRow[];
  bowling?: BowlingRow[];
}

export interface MatchMetadata {
  innings?: Innings[];
  scorecard?: ScorecardInnings[];
  competitionName?: string;
  competitionCode?: string;
  homeTeamCrest?: string | null;
  awayTeamCrest?: string | null;
  homeTeamFlag?: string | null;
  awayTeamFlag?: string | null;
  currentOvers?: number | null;
  toss?: string | null;
  series?: string | null;
  matchType?: string | null;
  venue?: string;
  minute?: number;
  recentBalls?: Array<{ label: string; type: string }>;
  matchday?: string | number;
  [key: string]: unknown;
}


export interface Match {
  id: string;
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  startTime: string;
  endTime?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeWickets?: number | null;
  awayWickets?: number | null;
  metadata?: MatchMetadata;
}


export interface FootballEvent {
  id: string;
  minute: number;
  type: "goal" | "yellow_card" | "red_card" | "substitution" | string;
  actor: string;
  team: "home" | "away" | string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface StandingsEntry {
  position: number;
  team: string;
  played: number;
  points: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}
