import { api } from "./client";

export interface Competition {
  code: string;
  name: string;
  country?: string;
  emblem?: string;
}

export interface StandingsTableEntry {
  position: number;
  team: { name: string; crest?: string };
  playedGames: number;
  points: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
}

export interface StandingsResponse {
  data: {
    standings: Array<{ table: StandingsTableEntry[] }>;
  };
}

export interface TeamEntry {
  id: number | string;
  name: string;
  shortName?: string;
  crest?: string;
  area: { name: string };
}

export interface TeamsResponse {
  data: { teams: TeamEntry[] };
}

export interface ScorerEntry {
  player: { name: string };
  team: { name: string; crest?: string };
  goals: number;
  assists?: number | null;
}

export interface ScorersResponse {
  data: { scorers: ScorerEntry[] };
}

export async function getCompetitions(): Promise<Competition[]> {
  const res = await api.get<{ data: Competition[] }>("/competitions");
  return res.data.data;
}

export async function getStandings(code: string): Promise<StandingsResponse> {
  const res = await api.get<StandingsResponse>(`/competitions/${code}/standings`);
  return res.data;
}

export async function getTeams(code: string): Promise<TeamsResponse> {
  const res = await api.get<TeamsResponse>(`/competitions/${code}/teams`);
  return res.data;
}

export async function getScorers(code: string): Promise<ScorersResponse> {
  const res = await api.get<ScorersResponse>(`/competitions/${code}/scorers`);
  return res.data;
}
