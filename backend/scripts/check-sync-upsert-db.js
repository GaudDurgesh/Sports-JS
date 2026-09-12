import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import dotenv from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, or, and, sql } from "drizzle-orm";
import { matches } from "../src/db/schema.js";

dotenv.config({
  path: new URL("../.env", import.meta.url),
  quiet: true,
});

assert.ok(process.env.DATABASE_URL, "DATABASE_URL is missing");

const source = readFileSync(
  new URL("../src/services/syncJob.js", import.meta.url),
  "utf8",
);
const start = source.indexOf("async function upsertMatch(");
const end = source.indexOf("async function cleanupStaleMatches", start);
assert.ok(start >= 0 && end > start);

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

try {
  await client.query("BEGIN");
  await client.query("SET LOCAL statement_timeout = '10s'");

  // Independent temporary table and temporary ID sequence.
  await client.query(`
    CREATE TEMP TABLE matches (
      id serial PRIMARY KEY,
      external_id text UNIQUE,
      sport text NOT NULL,
      home_team text NOT NULL,
      away_team text NOT NULL,
      status text NOT NULL,
      start_time timestamptz NOT NULL,
      end_time timestamptz,
      provider_updated_at timestamptz,
      home_score integer NOT NULL DEFAULT 0,
      away_score integer NOT NULL DEFAULT 0,
      home_wickets integer,
      away_wickets integer,
      metadata jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    ) ON COMMIT DROP
  `);

  // Confirm unqualified "matches" resolves to our temporary table.
  const scope = await client.query(`
    SELECT c.relnamespace = pg_my_temp_schema() AS temporary
    FROM pg_class c
    WHERE c.oid = 'matches'::regclass
  `);
  assert.equal(scope.rows[0]?.temporary, true);

  const notifications = [];
  const context = vm.createContext({
    db: drizzle(client),
    matches,
    eq,
    or,
    and,
    sql,
    Date,
  });

  vm.runInContext(
    `${source.slice(start, end)}
     globalThis.run = upsertMatch;`,
    context,
  );

  const base = {
    externalId: "test-cricket-1",
    sport: "cricket",
    homeTeam: "Home",
    awayTeam: "Away",
    homeScore: 100,
    awayScore: 80,
    homeWickets: 2,
    awayWickets: 3,
    status: "live",
    startTime: new Date("2026-09-12T10:00:00Z"),
    metadata: { overs: "12.3", venue: "Test ground" },
  };

  async function run(match) {
    notifications.length = 0;
    await context.run(
      match,
      () => notifications.push("updated"),
      () => notifications.push("created"),
    );
  }

  await run(base);
  assert.deepEqual(notifications, ["created"]);
  console.log("PASS: new match inserted");

  await run(base);
  assert.deepEqual(notifications, []);
  console.log("PASS: conflict with unchanged data skips update");

  await run({
    ...base,
    metadata: { venue: "Test ground", overs: "12.3" },
  });
  assert.deepEqual(notifications, []);
  console.log("PASS: JSON key order does not cause an update");

  for (const patch of [
    { homeWickets: 3 },
    { homeWickets: 1 },
    { awayWickets: 4 },
  ]) {
    await run({ ...base, ...patch });
    assert.deepEqual(notifications, ["updated"]);

    const { rows } = await client.query(
      "SELECT * FROM pg_temp.matches WHERE external_id = $1",
      [base.externalId],
    );
    assert.equal(rows[0].home_wickets, patch.homeWickets ?? base.homeWickets);
    assert.equal(rows[0].away_wickets, patch.awayWickets ?? base.awayWickets);
  }
  console.log("PASS: wicket changes and downward corrections persist");

  const moved = {
    ...base,
    startTime: new Date("2026-09-12T12:00:00Z"),
  };
  await run(moved);
  assert.deepEqual(notifications, ["updated"]);

  const { rows } = await client.query("SELECT * FROM pg_temp.matches");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].start_time.toISOString(), moved.startTime.toISOString());
  console.log("PASS: rescheduled time persists; one row per external ID");

  const olderTime = new Date("2026-09-12T10:00:00Z");
  const initialTime = new Date("2026-09-12T11:00:00Z");
  const newerTime = new Date("2026-09-12T12:00:00Z");

  const football = {
    ...base,
    externalId: "fd-test-freshness",
    sport: "football",
    homeScore: 1,
    awayScore: 0,
    homeWickets: null,
    awayWickets: null,
    providerUpdatedAt: initialTime,
  };

  async function storedFootball() {
    const result = await client.query(
      `SELECT home_score, provider_updated_at
       FROM pg_temp.matches
       WHERE external_id = $1`,
      [football.externalId],
    );
    return result.rows[0];
  }

  await run(football);
  assert.deepEqual(notifications, ["created"]);
  assert.equal(
    (await storedFootball()).provider_updated_at.toISOString(),
    initialTime.toISOString(),
  );

  // Older, equal, and missing timestamps cannot overwrite this row.
  for (const timestamp of [olderTime, initialTime, null]) {
    await run({
      ...football,
      homeScore: 9,
      providerUpdatedAt: timestamp,
    });

    assert.deepEqual(notifications, []);
    const stored = await storedFootball();
    assert.equal(stored.home_score, 1);
    assert.equal(
      stored.provider_updated_at.toISOString(),
      initialTime.toISOString(),
    );
  }
  console.log("PASS: older, equal and missing timestamps cannot overwrite");

  // A newer provider correction may legitimately reduce a score.
  await run({
    ...football,
    homeScore: 0,
    providerUpdatedAt: newerTime,
  });
  assert.deepEqual(notifications, ["updated"]);
  assert.equal((await storedFootball()).home_score, 0);
  console.log("PASS: newer timestamp permits a downward score correction");

  // Even with unchanged scores, advance the stored provider timestamp.
  const latestTime = new Date("2026-09-12T13:00:00Z");
  await run({
    ...football,
    homeScore: 0,
    providerUpdatedAt: latestTime,
  });
  assert.equal(
    (await storedFootball()).provider_updated_at.toISOString(),
    latestTime.toISOString(),
  );

  await run({
    ...football,
    homeScore: 8,
    providerUpdatedAt: newerTime,
  });
  assert.deepEqual(notifications, []);
  assert.equal((await storedFootball()).home_score, 0);
  console.log("PASS: timestamp advances even when scores are unchanged");

  // Existing rows without provider timestamps can acquire one.
  const legacy = {
    ...football,
    externalId: "fd-test-legacy",
    providerUpdatedAt: null,
  };
  await run(legacy);
  await run({
    ...legacy,
    providerUpdatedAt: initialTime,
  });
  assert.deepEqual(notifications, ["updated"]);

  const legacyResult = await client.query(
    `SELECT provider_updated_at
     FROM pg_temp.matches
     WHERE external_id = $1`,
    [legacy.externalId],
  );
  assert.equal(
    legacyResult.rows[0].provider_updated_at.toISOString(),
    initialTime.toISOString(),
  );
  console.log("PASS: legacy row accepts its first provider timestamp");
} finally {
  try {
    await client.query("ROLLBACK");
  } finally {
    await client.end();
  }
}

console.log("Temporary test data rolled back. No provider API requests.");
