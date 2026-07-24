import { api } from "./client";
import type { ApiResponse, Match, FootballEvent } from "@/types";

export async function getMatches(): Promise<Match[]> {
  const res = await api.get<ApiResponse<Match[]>>("/matches");
  return res.data.data;
}

export async function getMatch(id: string): Promise<Match> {
  const res = await api.get<ApiResponse<Match>>(`/matches/${id}`);
  return res.data.data;
}

export async function getMatchEvents(id: string): Promise<FootballEvent[]> {
  const res = await api.get<ApiResponse<FootballEvent[]>>(`/matches/${id}/events`);
  return res.data.data;
}
