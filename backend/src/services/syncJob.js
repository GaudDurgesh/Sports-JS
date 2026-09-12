import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { eq, or, and, lt } from "drizzle-orm";
import {
  fetchLiveCricketMatches,
  fetchLiveFootballMatches,
  fetchScheduledFootballMatches,
} from "./externalApi.js";

// ─── Upsert ───────────────────────────────────────────────────────────────────
// INSERT on first sight of an externalId, UPDATE only when something changed.
// homeTeam/awayTeam are included in the update set so stale rows self-correct.

async function upsertMatch(
  normalized,
  broadcastScoreUpdate,
  broadcastMatchCreated,
) {
  const existing = await db
    .select()
    .from(matches)
    .where(eq(matches.externalId, normalized.externalId))
    .limit(1);

  if (existing.length > 0) {
    const current = existing[0];

    const scoreChanged =
      current.homeScore !== normalized.homeScore ||
      current.awayScore !== normalized.awayScore;
    const wicketsChanged =
      (current.homeWickets ?? null) !== (normalized.homeWickets ?? null) ||
      (current.awayWickets ?? null) !== (normalized.awayWickets ?? null);
    const statusChanged = current.status !== normalized.status;
    const teamsChanged =
      current.homeTeam !== normalized.homeTeam ||
      current.awayTeam !== normalized.awayTeam;
    const metadataChanged =
      JSON.stringify(current.metadata) !== JSON.stringify(normalized.metadata);

    if (
      scoreChanged ||
      wicketsChanged ||
      statusChanged ||
      teamsChanged ||
      metadataChanged
    ) {
      await db
        .update(matches)
        .set({
          homeTeam: normalized.homeTeam,
          awayTeam: normalized.awayTeam,
          homeScore: normalized.homeScore,
          awayScore: normalized.awayScore,
          homeWickets: normalized.homeWickets ?? null, // ← add
          awayWickets: normalized.awayWickets ?? null, // ← add
          status: normalized.status,
          endTime: normalized.endTime,
          metadata: normalized.metadata ?? null,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, current.id));
      if (scoreChanged) {
        broadcastScoreUpdate({
          matchId: current.id,
          homeScore: normalized.homeScore,
          awayScore: normalized.awayScore,
        });
      }
    }
  } else {
    const [inserted] = await db
      .insert(matches)
      .values({ ...normalized, updatedAt: new Date() })
      .returning();

    broadcastMatchCreated({ matchId: inserted.id, match: inserted });
  }
}

// ─── Sync jobs ────────────────────────────────────────────────────────────────

// ─── Stale match cleanup ──────────────────────────────────────────────────────
// Matches can get stuck in 'live' or 'scheduled' if the external API stops
// returning them (match ended between sync cycles, or API missed it).
// This job corrects stale statuses using time-based heuristics — no API calls.

async function cleanupStaleMatches() {
  try {
    const now = new Date();

    // Cricket: live matches older than 5 hours → finished
    const cricketCutoff = new Date(now - 5 * 60 * 60_000);
    // Football: live matches older than 3 hours → finished
    const footballCutoff = new Date(now - 3 * 60 * 60_000);
    // Any sport: scheduled matches whose start time passed 1 hour ago → finished
    const scheduledCutoff = new Date(now - 1 * 60 * 60_000);

    const allStale = await db
      .select({
        id: matches.id,
        sport: matches.sport,
        status: matches.status,
        startTime: matches.startTime,
      })
      .from(matches)
      .where(
        or(
          // live cricket stuck too long
          and(
            eq(matches.status, "live"),
            eq(matches.sport, "cricket"),
            lt(matches.startTime, cricketCutoff),
          ),
          // live football stuck too long
          and(
            eq(matches.status, "live"),
            eq(matches.sport, "football"),
            lt(matches.startTime, footballCutoff),
          ),
          // scheduled match whose time has passed
          and(
            eq(matches.status, "scheduled"),
            lt(matches.startTime, scheduledCutoff),
          ),
        ),
      );

    if (allStale.length === 0) return;

    await Promise.all(
      allStale.map((m) =>
        db
          .update(matches)
          .set({ status: "finished", updatedAt: new Date() })
          .where(eq(matches.id, m.id)),
      ),
    );

    console.log(
      `[cleanup] marked ${allStale.length} stale matches as finished`,
    );
  } catch (err) {
    console.error("[cleanup] failed:", err.message);
  }
}

const runningSyncJobs = new Set();

async function runSyncJob(
  name,
  fetchMatches,
  broadcastScoreUpdate,
  broadcastMatchCreated,
) {
  if (runningSyncJobs.has(name)) {
    console.log(`[sync:${name}] skipped: previous run still active`);
    return;
  }

  runningSyncJobs.add(name);

  try {
    const results = await fetchMatches();

    if (!Array.isArray(results)) {
      throw new Error("Provider returned an invalid match list");
    }

    const outcomes = await Promise.allSettled(
      results.map((match) =>
        upsertMatch(match, broadcastScoreUpdate, broadcastMatchCreated),
      ),
    );

    const failures = outcomes.filter(
      (outcome) => outcome.status === "rejected",
    );

    console.log(
      `[sync:${name}] processed ${results.length} matches; ` +
        `${failures.length} failed`,
    );

    if (failures.length > 0) {
      console.error(
        `[sync:${name}] first match failure:`,
        failures[0].reason?.message ?? "Unknown error",
      );
    }
  } catch (err) {
    console.error(`[sync:${name}] failed:`, err.message);
  } finally {
    runningSyncJobs.delete(name);
  }
}

async function syncCricket(broadcastScoreUpdate, broadcastMatchCreated) {
  return runSyncJob(
    "cricket",
    fetchLiveCricketMatches,
    broadcastScoreUpdate,
    broadcastMatchCreated,
  );
}

async function syncFootballLive(broadcastScoreUpdate, broadcastMatchCreated) {
  return runSyncJob(
    "football-live",
    fetchLiveFootballMatches,
    broadcastScoreUpdate,
    broadcastMatchCreated,
  );
}

async function syncFootballSchedule(
  broadcastScoreUpdate,
  broadcastMatchCreated,
) {
  return runSyncJob(
    "football-schedule",
    fetchScheduledFootballMatches,
    broadcastScoreUpdate,
    broadcastMatchCreated,
  );
}

// ─── Intervals ────────────────────────────────────────────────────────────────
// Cricket  : 1 call/cycle via Cricbuzz RapidAPI (200 req/month limit)
//            4-hour interval = 180 calls/month — safe headroom for restarts
// Football live     : every 30s (football-data.org free tier is generous)
// Football schedule : every 15 min

const CRICKET_INTERVAL_MS = 4 * 60 * 60_000; // 4 hours
// Poll every 2 minutes while shared provider throttling is implemented.
const FOOTBALL_LIVE_MS = 2 * 60_000;
const FOOTBALL_SCHEDULE_MS = 15 * 60_000; // 15 minutes

export function startSyncJob({ broadcastScoreUpdate, broadcastMatchCreated }) {
  console.log("[sync] Starting sync jobs...");
  const args = [broadcastScoreUpdate, broadcastMatchCreated];

  // Run immediately on startup so DB has data before first request
  syncCricket(...args);
  syncFootballLive(...args);
  syncFootballSchedule(...args);

  const cricketTimer = setInterval(
    () => syncCricket(...args),
    CRICKET_INTERVAL_MS,
  );
  const footballLiveTimer = setInterval(
    () => syncFootballLive(...args),
    FOOTBALL_LIVE_MS,
  );
  const footballScheduleTimer = setInterval(
    () => syncFootballSchedule(...args),
    FOOTBALL_SCHEDULE_MS,
  );

  // Return cleanup fn for graceful shutdown
  return () => {
    clearInterval(cricketTimer);
    clearInterval(footballLiveTimer);
    clearInterval(footballScheduleTimer);
  };
}
