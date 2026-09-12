import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
  new URL("../src/services/syncJob.js", import.meta.url),
  "utf8",
);

const start = source.indexOf("async function upsertMatch(");
const end = source.indexOf("async function cleanupStaleMatches", start);
assert.ok(start >= 0 && end > start, "Cannot locate upsertMatch");

let current;
const writes = [];

const db = {
  select: () => ({
    from: () => ({
      where: () => ({
        limit: async () => [current],
      }),
    }),
  }),
  update: () => ({
    set: (values) => ({
      where: async () => {
        writes.push(values);
      },
    }),
  }),
};

const context = vm.createContext({
  db,
  matches: { id: "id", externalId: "externalId" },
  eq: () => true,
  Date,
});

vm.runInContext(
  `${source.slice(start, end)}
   globalThis.runUpsert = upsertMatch;`,
  context,
);

const base = {
  id: 1,
  externalId: "test-cricket-1",
  homeTeam: "Home",
  awayTeam: "Away",
  homeScore: 100,
  awayScore: 80,
  homeWickets: 2,
  awayWickets: 3,
  status: "live",
  metadata: {},
};

async function check(label, stored, incoming, expectedWrites) {
  current = stored;
  writes.length = 0;

  await context.runUpsert(incoming, () => {}, () => {});

  assert.equal(writes.length, expectedWrites, label);

  if (expectedWrites) {
    assert.equal(writes[0].homeWickets, incoming.homeWickets ?? null);
    assert.equal(writes[0].awayWickets, incoming.awayWickets ?? null);
  }

  console.log(`PASS: ${label}`);
}

await check("unchanged match skips update", base, { ...base }, 0);
await check(
  "home wicket alone triggers update",
  base,
  { ...base, homeWickets: 3 },
  1,
);
await check(
  "away wicket alone triggers update",
  base,
  { ...base, awayWickets: 4 },
  1,
);
await check(
  "wicket correction downward triggers update",
  base,
  { ...base, homeWickets: 1 },
  1,
);
await check(
  "null and undefined wickets are equivalent",
  { ...base, homeWickets: null },
  { ...base, homeWickets: undefined },
  0,
);

console.log("No API requests or database connections were made.");