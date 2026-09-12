import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
  new URL("../src/services/syncJob.js", import.meta.url),
  "utf8",
);

const start = source.indexOf("const runningSyncJobs = new Set();");
const end = source.indexOf("async function syncCricket(", start);
assert.ok(start >= 0 && end > start, "Cannot locate sync runner");

let saveMatch = async () => {};
const errors = [];

const context = vm.createContext({
  console: {
    log: () => {},
    error: (...args) => errors.push(args),
  },
  upsertMatch: async (...args) => saveMatch(...args),
});

vm.runInContext(
  `${source.slice(start, end)}
   globalThis.run = runSyncJob;`,
  context,
);

const run = (name, fetcher) =>
  context.run(name, fetcher, () => {}, () => {});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// A pending fetch must block another run of the same job.
const fetchGate = deferred();
let fetchCalls = 0;

const firstRun = run("cricket", () => {
  fetchCalls += 1;
  return fetchGate.promise;
});

await run("cricket", async () => {
  fetchCalls += 1;
  return [];
});
assert.equal(fetchCalls, 1);

// A different job should still run.
let otherJobRan = false;
await run("football-live", async () => {
  otherJobRan = true;
  return [];
});
assert.equal(otherJobRan, true);

fetchGate.resolve([]);
await firstRun;
console.log("PASS: same job skips overlap; different jobs run independently");

// A failed write must not release the guard while another write is pending.
const slowWrite = deferred();
const writesStarted = deferred();
let writeCount = 0;

saveMatch = async (match) => {
  writeCount += 1;
  if (writeCount === 2) writesStarted.resolve();

  if (match.id === 1) throw new Error("Simulated write failure");
  await slowWrite.promise;
};

const savingRun = run("cricket", async () => [{ id: 1 }, { id: 2 }]);
await writesStarted.promise;

// Let rejection handlers run while the second write remains pending.
await new Promise((resolve) => setImmediate(resolve));

let overlapFetched = false;
await run("cricket", async () => {
  overlapFetched = true;
  return [];
});
assert.equal(overlapFetched, false);

slowWrite.resolve();
await savingRun;
assert.ok(
  errors.some((args) =>
    args.some((value) => String(value).includes("Simulated write failure")),
  ),
);

let recovered = false;
await run("cricket", async () => {
  recovered = true;
  return [];
});
assert.equal(recovered, true);
console.log("PASS: failed write waits for remaining writes; next run succeeds");

// Fetch errors and malformed responses must also release the guard.
for (const [label, fetcher] of [
  ["fetch failure", async () => {
    throw new Error("Simulated fetch failure");
  }],
  ["invalid match list", async () => null],
]) {
  await run("cricket", fetcher);

  let nextRunStarted = false;
  await run("cricket", async () => {
    nextRunStarted = true;
    return [];
  });

  assert.equal(nextRunStarted, true);
  console.log(`PASS: recovery after ${label}`);
}

console.log("No API requests or database connections were made.");