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
    eq, or, and, sql, Date,
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

  const { rows } = await client.query(
    "SELECT * FROM pg_temp.matches",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].start_time.toISOString(), moved.startTime.toISOString());
  console.log("PASS: rescheduled time persists; one row per external ID");
} finally {
  try {
    await client.query("ROLLBACK");
  } finally {
    await client.end();
  }
}

console.log("Temporary test data rolled back. No provider API requests.");