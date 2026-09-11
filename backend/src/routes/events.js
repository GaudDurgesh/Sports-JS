import { Router } from "express";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { footballGet } from "../services/footballClient.js";
import { normalizeFootballEvents } from "../services/normalizeFootballEvents.js";

export const eventsRouter = Router({ mergeParams: true });

// In-memory cache — finished matches never change, no point re-fetching
// Key: internal match id, Value: { data, cachedAt }
const cache = new Map();
const CACHE_TTL_LIVE = 30_000; // 30s for live matches
const CACHE_TTL_FINISHED = 6 * 60 * 60_000; // 6 hours
const CACHE_TTL_UNAVAILABLE = 5 * 60_000; // 5 minutes
const inFlight = new Map();
const cacheWriters = new Map();

function isCacheValid(entry, isFinished) {
  if (!entry) return false;

  // Refresh once when a match first becomes finished.
  if (entry.isFinished !== isFinished) return false;

  const hasMissingCoverage = entry.data.coverage !== "complete";

  const ttl = isFinished
    ? hasMissingCoverage
      ? CACHE_TTL_UNAVAILABLE
      : CACHE_TTL_FINISHED
    : CACHE_TTL_LIVE;

  return Date.now() - entry.cachedAt < ttl;
}

function fetchAndCacheEvents(matchId, footballId, isFinished) {
  const key = `${matchId}:${footballId}:${isFinished}`;

  const existing = inFlight.get(key);
  if (existing) return existing;

  // Only the latest newly started fetch may write this match's cache.
  const token = {};
  cacheWriters.set(matchId, token);

  const request = (async () => {
    const { data } = await footballGet(`/matches/${footballId}`);
    const result = normalizeFootballEvents(data, matchId);

    if (cacheWriters.get(matchId) === token) {
      cache.set(matchId, {
        data: result,
        cachedAt: Date.now(),
        isFinished,
      });
    }

    return result;
  })();

  const tracked = request.finally(() => {
    inFlight.delete(key);

    if (cacheWriters.get(matchId) === token) {
      cacheWriters.delete(matchId);
    }
  });

  inFlight.set(key, tracked);
  return tracked;
}

// GET /matches/:id/events
eventsRouter.get("/:id/events", async (req, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isSafeInteger(matchId) || matchId <= 0) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  try {
    // 1. Look up the match in our DB
    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // 2. Only football matches have external events
    if (match.sport !== "football") {
      return res
        .status(400)
        .json({ error: "Events only available for football matches" });
    }

    // 3. externalId for football is "fd-537392" — strip the "fd-" prefix
    if (!match.externalId || !match.externalId.startsWith("fd-")) {
      return res
        .status(404)
        .json({ error: "No external data available for this match" });
    }

    const footballId = match.externalId.replace("fd-", "");
    const isFinished = match.status === "finished";

    // 4. Check cache first
    const cached = cache.get(matchId);
    if (isCacheValid(cached, isFinished)) {
      return res.json({
        data: cached.data.events,
        meta: {
          coverage: cached.data.coverage,
          unavailable: cached.data.unavailable,
        },
        cached: true,
      });
    }

    const result = await fetchAndCacheEvents(matchId, footballId, isFinished);

    return res.json({
      data: result.events,
      meta: {
        coverage: result.coverage,
        unavailable: result.unavailable,
      },
      cached: false,
    });
  } catch (err) {
    if (err.code === "FOOTBALL_QUEUE_FULL") {
      res.set("Retry-After", "30");

      return res.status(503).json({
        error: "Football data is temporarily busy. Please try again shortly.",
        code: "FOOTBALL_QUEUE_FULL",
      });
    }

    if (err.response?.status === 404) {
      return res
        .status(404)
        .json({ error: "Match not found on football-data.org" });
    }
    if (err.response?.status === 429) {
      return res
        .status(429)
        .json({ error: "Rate limited — try again shortly" });
    }
    console.error("[events] failed:", err.message);
    res.status(500).json({ error: "Failed to fetch match events" });
  }
});
