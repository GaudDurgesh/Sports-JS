import { z } from "zod";
import { api } from "./client";
import type { ApiResponse, Match, MatchEventsResponse } from "@/types";

export async function getMatches(): Promise<Match[]> {
  const res = await api.get<ApiResponse<Match[]>>("/matches");
  return res.data.data;
}

export async function getMatch(id: string): Promise<Match> {
  const res = await api.get<ApiResponse<Match>>(`/matches/${id}`);
  return res.data.data;
}

const footballEventSchema = z.object({
  id: z.string(),
  minute: z.number().int().nonnegative().nullable(),
  type: z.string(),
  actor: z.string(),
  team: z.string(),
  message: z.string().nullable().optional(),
  metadata: z
    .object({
      addedTime: z.number().int().nonnegative().nullable().optional(),
      providerType: z.string().nullable().optional(),
      card: z.string().nullable().optional(),
      assist: z.string().nullable().optional(),
    })
    .passthrough()
    .nullable()
    .optional(),
});

export const matchEventsResponseSchema = z.object({
  data: z.array(footballEventSchema),
  meta: z.object({
    coverage: z.enum(["complete", "partial", "unavailable"]),
    unavailable: z.array(z.string()),
  }),
  cached: z.boolean(),
});

export async function getMatchEvents(id: string): Promise<MatchEventsResponse> {
  const res = await api.get(`/matches/${id}/events`);
  const parsed = matchEventsResponseSchema.safeParse(res.data);
  if (!parsed.success) {
    throw new Error("Unexpected events response from the server.");
  }
  return parsed.data as MatchEventsResponse;
}
