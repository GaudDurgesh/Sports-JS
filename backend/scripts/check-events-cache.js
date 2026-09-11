import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source = fs.readFileSync(
  new URL("../src/routes/events.js", import.meta.url),
  "utf8",
);

// Load only the actual cache constants and validation function.
const start = source.indexOf("const CACHE_TTL_LIVE");
const end = source.indexOf("// GET /matches/:id/events", start);

assert.ok(start >= 0 && end > start, "Cache code section not found");

let now = 0;

const context = vm.createContext({
  Date: { now: () => now },
});

vm.runInContext(source.slice(start, end), context);
const valid = context.isCacheValid;

assert.equal(valid(undefined, false), false);

const scenarios = [
  { finished: false, coverage: "complete", ttl: 30_000 },
  { finished: false, coverage: "unavailable", ttl: 30_000 },
  { finished: true, coverage: "complete", ttl: 21_600_000 },
  { finished: true, coverage: "partial", ttl: 300_000 },
  { finished: true, coverage: "unavailable", ttl: 300_000 },
];

for (const scenario of scenarios) {
  const entry = {
    data: { coverage: scenario.coverage },
    cachedAt: 0,
    isFinished: scenario.finished,
  };

  now = scenario.ttl - 1;
  assert.equal(valid(entry, scenario.finished), true);

  now = scenario.ttl;
  assert.equal(valid(entry, scenario.finished), false);
}

now = 1;

assert.equal(
  valid({
    data: { coverage: "complete" },
    cachedAt: 0,
    isFinished: false,
  }, true),
  false,
);

assert.equal(
  valid({
    data: { coverage: "complete" },
    cachedAt: 0,
    isFinished: true,
  }, false),
  false,
);

console.log("PASS: missing cache, expiry boundaries and status changes");
console.log("No API requests or database connections were made.");