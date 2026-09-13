import { z } from "zod";
import type { Query, QueryClient, QueryKey } from "@tanstack/react-query";

/** Canonical positive decimal integer string: no signs, whitespace, hex,
 *  exponents or leading-zero aliases. */
const CANONICAL_POSITIVE_INT = /^[1-9]\d*$/;

/** Coerces a match id of unknown origin into a positive safe integer, or null. */
export function toWireMatchId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string") {
    if (!CANONICAL_POSITIVE_INT.test(value)) return null;
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }
  return null;
}

const matchIdSchema = z.number().refine((n) => toWireMatchId(n) !== null, "invalid matchId");

const welcomeSchema = z.object({ type: z.literal("welcome") });
const subscribedSchema = z.object({
  type: z.literal("subscribed"),
  matchId: matchIdSchema,
});
const unsubscribedSchema = z.object({
  type: z.literal("unsubscribed"),
  matchId: matchIdSchema,
});
const scoreUpdateSchema = z.object({
  type: z.literal("score_update"),
  data: z
    .object({
      matchId: matchIdSchema,
      homeScore: z.number().nullable().optional(),
      awayScore: z.number().nullable().optional(),
    })
    .passthrough(),
});
const matchCreatedSchema = z.object({ type: z.literal("match_created") });

export const serverMessageSchema = z.union([
  welcomeSchema,
  subscribedSchema,
  unsubscribedSchema,
  scoreUpdateSchema,
  matchCreatedSchema,
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** Parses a raw socket payload. Returns null for malformed/unsupported messages. */
export function parseServerMessage(raw: unknown): ServerMessage | null {
  let json: unknown = raw;
  if (typeof raw === "string") {
    try {
      json = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const parsed = serverMessageSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** Exact ["matches"] key. */
export function isMatchListKey(key: QueryKey | undefined): boolean {
  return Array.isArray(key) && key.length === 1 && key[0] === "matches";
}

/** Exact ["match", id] key. */
export function isMatchDetailKey(key: QueryKey | undefined): boolean {
  return Array.isArray(key) && key.length === 2 && key[0] === "match";
}

export function isRelevantKey(key: QueryKey | undefined): boolean {
  return isMatchListKey(key) || isMatchDetailKey(key);
}

function idsFromMatchList(data: unknown): number[] {
  if (!Array.isArray(data)) return [];
  const out: number[] = [];
  for (const item of data) {
    const id = toWireMatchId((item as { id?: unknown } | null)?.id);
    if (id !== null) out.push(id);
  }
  return out;
}

/**
 * Desired subscriptions = ids in active ["matches"] caches plus ids of active
 * ["match", id] queries. Deduplicated.
 */
export function collectDesiredSubscriptions(client: QueryClient): Set<number> {
  const desired = new Set<number>();
  const queries = client.getQueryCache().getAll() as Query[];
  for (const query of queries) {
    if (!query.isActive()) continue;
    const key = query.queryKey;
    if (isMatchListKey(key)) {
      for (const id of idsFromMatchList(query.state.data)) desired.add(id);
    } else if (isMatchDetailKey(key)) {
      const id = toWireMatchId(key[1]);
      if (id !== null) desired.add(id);
    }
  }
  return desired;
}

export function diffSubscriptions(
  desired: Set<number>,
  sent: Set<number>,
): { toSubscribe: number[]; toUnsubscribe: number[] } {
  const toSubscribe: number[] = [];
  const toUnsubscribe: number[] = [];
  for (const id of desired) if (!sent.has(id)) toSubscribe.push(id);
  for (const id of sent) if (!desired.has(id)) toUnsubscribe.push(id);
  return { toSubscribe, toUnsubscribe };
}
