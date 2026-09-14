import { z } from "zod";
import { api } from "./client";

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const optionalCount = count.nullable();
const optionalRate = z.number().finite().nonnegative().nullable();

const battingSchema = z.object({
  playerId: count,
  name: z.string().min(1),
  runs: count,
  balls: count,
  fours: count,
  sixes: count,
  strikeRate: optionalRate,
  dismissal: z.string().nullable(),
});

const bowlingSchema = z.object({
  playerId: count,
  name: z.string().min(1),
  overs: z.string().nullable(),
  maidens: count,
  runs: count,
  wickets: count,
  economy: optionalRate,
});

const extrasSchema = z.object({
  byes: optionalCount,
  legByes: optionalCount,
  wides: optionalCount,
  noBalls: optionalCount,
  penalty: optionalCount,
  total: optionalCount,
});

const fallOfWicketSchema = z.object({
  playerId: count,
  name: z.string().min(1),
  teamRuns: count,
  delivery: z.string().nullable(),
});

const partnershipBatterSchema = z.object({
  playerId: count,
  name: z.string().min(1),
  runs: optionalCount,
  balls: optionalCount,
});

const partnershipSchema = z.object({
  runs: count,
  balls: optionalCount,
  batters: z.array(partnershipBatterSchema).length(2),
});

const inningsSchema = z.object({
  id: count.positive(),
  teamName: z.string().min(1),
  teamShortName: z.string().nullable(),
  runs: count,
  wickets: count,
  overs: z.string().nullable(),
  declared: z.boolean().nullable(),
  followOn: z.boolean().nullable(),
  batting: z.array(battingSchema).nullable(),
  bowling: z.array(bowlingSchema).nullable(),
  extras: extrasSchema.nullable(),
  fallOfWickets: z.array(fallOfWicketSchema).nullable(),
  partnerships: z.array(partnershipSchema).nullable(),
});

export const cricketScorecardSchema = z.object({
  complete: z.boolean(),
  result: z.string().nullable(),
  innings: z.array(inningsSchema).min(1),
});

export const scorecardResponseSchema = z.union([
  z.object({
    data: cricketScorecardSchema,
    meta: z.object({
      availability: z.literal("available"),
      source: z.literal("saved"),
      provider: z.string().min(1),
      schemaVersion: z.literal(1),
      savedAt: z.string().datetime({ offset: true }),
    }),
  }),
  z.object({
    data: z.null(),
    meta: z.object({
      availability: z.enum(["not_saved", "unsupported"]),
    }),
  }),
]);

export type CricketScorecard = z.infer<typeof cricketScorecardSchema>;
export type CricketInnings = z.infer<typeof inningsSchema>;
export type ScorecardResponse = z.infer<typeof scorecardResponseSchema>;

export async function getCricketScorecard(
  id: string,
): Promise<ScorecardResponse> {
  const response = await api.get(`/matches/${id}/scorecard`);
  const parsed = scorecardResponseSchema.safeParse(response.data);

  if (!parsed.success) {
    throw new Error("Unexpected scorecard response from the server.");
  }

  return parsed.data;
}