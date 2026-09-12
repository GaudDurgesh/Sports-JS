import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { eq, or, and, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { matches } from "../src/db/schema.js";

const source = readFileSync(
  new URL("../src/services/syncJob.js", import.meta.url),
  "utf8",
);

const start = source.indexOf("async function upsertMatch(");
const end = source.indexOf("async function cleanupStaleMatches", start);
assert.ok(start >= 0 && end > start, "Cannot locate upsertMatch");

const dialect = new PgDialect();
let insertRows;
let updateRows;
let failure;
let insertCount;
let updateCount;
let savedValues;
let condition;
const created = [];
const updated = [];

const db = {
  insert: () => ({
    values: () => ({
      onConflictDoNothing: ({ target }) => {
        assert.equal(target, matches.externalId);

        return {
          returning: async () => {
            insertCount++;
            if (failure === "insert") throw new Error("Insert failed");
            return insertRows;
          },
        };
      },
    }),
  }),
  update: () => ({
    set: (values) => {
      savedValues = values;
      return {
        where: (where) => {
          condition = dialect.sqlToQuery(where);
          return {
            returning: async () => {
              updateCount++;
              if (failure === "update") throw new Error("Update failed");
              return updateRows;
            },
          };
        },
      };
    },
  }),
};

const context = vm.createContext({
  db, matches, eq, or, and, sql, Date,
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
  metadata: { overs: "12.3" },
};

function reset() {
  insertRows = [];
  updateRows = [];
  failure = null;
  insertCount = 0;
  updateCount = 0;
  savedValues = null;
  condition = null;
  created.length = 0;
  updated.length = 0;
}

const run = (match = base) =>
  context.run(
    match,
    (event) => updated.push(event),
    (event) => created.push(event),
  );

reset();
insertRows = [{ ...base, id: 7 }];
await run();
assert.equal(created.length, 1);
assert.equal(created[0].matchId, 7);
assert.equal(updated.length, 0);
assert.equal(updateCount, 0);
console.log("PASS: inserted row emits only creation notification");

reset();
updateRows = [{ ...base, id: 7, homeScore: 105 }];
await run();
assert.equal(insertCount, 1);
assert.equal(updateCount, 1);
assert.equal(created.length, 0);
assert.equal(updated.length, 1);
assert.equal(updated[0].homeScore, 105);
console.log("PASS: insert conflict uses update and returned database values");

assert.ok(condition.sql.includes("is distinct from") ||
          condition.sql.includes("IS DISTINCT FROM"));
assert.ok(condition.params.includes(base.startTime.toISOString()));
assert.ok(condition.params.includes(JSON.stringify(base.metadata)));
assert.equal(
  condition.params.some((value) => value instanceof Date),
  false,
);
console.log("PASS: comparison dates and JSON use column encoders");

reset();
await run();
assert.equal(created.length, 0);
assert.equal(updated.length, 0);
console.log("PASS: update returning no row emits no notification");

for (const patch of [
  { homeWickets: 3 },
  { awayWickets: 4 },
  { homeWickets: 1 },
  { startTime: new Date("2026-09-12T12:00:00Z") },
]) {
  reset();
  await run({ ...base, ...patch });

  for (const [key, value] of Object.entries(patch)) {
    assert.equal(savedValues[key], value);
    assert.ok(condition.sql.includes(matches[key].name));
  }
}
console.log("PASS: wickets and rescheduled time included in update/comparison");

for (const stage of ["insert", "update"]) {
  reset();
  failure = stage;
  await assert.rejects(run(), /failed/i);
  assert.equal(created.length, 0);
  assert.equal(updated.length, 0);
}
console.log("PASS: failed writes emit no notification");

for (const patch of [
  { externalId: "" },
  { startTime: new Date("invalid") },
]) {
  reset();
  await assert.rejects(run({ ...base, ...patch }));
  assert.equal(insertCount, 0);
}
console.log("PASS: invalid identity/date rejected before database access");

console.log("No API requests or database connections were made.");