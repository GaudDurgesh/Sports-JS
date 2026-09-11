import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { normalizeFootballEvents } from "../src/services/normalizeFootballEvents.js";

const source = fs.readFileSync(
  new URL("../src/routes/events.js", import.meta.url),
  "utf8",
);

const start = source.indexOf("function fetchAndCacheEvents");
const end = source.indexOf("// GET /matches/:id/events", start);

assert.ok(start >= 0 && end > start, "Helper function not found");

const cache = new Map();
const inFlight = new Map();
const cacheWriters = new Map();
const calls = [];

const context = vm.createContext({
  cache,
  inFlight,
  Date,
  normalizeFootballEvents,
  cacheWriters,
  footballGet(path) {
    return new Promise((resolve, reject) => {
      calls.push({ path, resolve, reject });
    });
  },
});

vm.runInContext(source.slice(start, end), context);
const fetchEvents = context.fetchAndCacheEvents;

const payload = {
  data: {
    goals: [],
    bookings: [],
    substitutions: [],
  },
};

// Five callers share one pending provider request.
const requests = Array.from(
  { length: 5 },
  () => fetchEvents(1, "101", false),
);

assert.equal(calls.length, 1);
assert.ok(requests.every((request) => request === requests[0]));

calls[0].resolve(payload);
const results = await Promise.all(requests);

assert.ok(results.every((result) => result === results[0]));
assert.equal(cache.get(1).data, results[0]);
assert.equal(inFlight.size, 0);
console.log("PASS: five callers share one request and cache result");

// A failure reaches every caller and clears the pending entry.
const failedRequests = [
  fetchEvents(2, "102", false),
  fetchEvents(2, "102", false),
];

const settled = Promise.allSettled(failedRequests);
assert.equal(calls.length, 2);

calls[1].reject(new Error("Simulated provider failure"));

assert.ok(
  (await settled).every((result) => result.status === "rejected"),
);
assert.equal(inFlight.size, 0);
assert.equal(cache.has(2), false);
console.log("PASS: shared failure clears pending entry");

// Retry starts a new request.
const retry = fetchEvents(2, "102", false);
assert.equal(calls.length, 3);

calls[2].resolve(payload);
await retry;

assert.equal(cache.has(2), true);
assert.equal(inFlight.size, 0);
console.log("PASS: retry succeeds after failure");

// A finished request does not reuse an in-flight live request.
const live = fetchEvents(3, "103", false);
const finished = fetchEvents(3, "103", true);

assert.notEqual(live, finished);
assert.equal(calls.length, 5);

calls[3].resolve(payload);
await live;

calls[4].resolve(payload);
await finished;

assert.equal(cache.get(3).isFinished, true);
assert.equal(inFlight.size, 0);
console.log("PASS: live and finished requests stay separate");

// Newer finished response arrives before the older live response.
const older = fetchEvents(4, "104", false);
const olderCall = calls.at(-1);

const newer = fetchEvents(4, "104", true);
const newerCall = calls.at(-1);

newerCall.resolve(payload);
await newer;

const newestEntry = cache.get(4);

olderCall.resolve(payload);
await older;

assert.equal(cache.get(4), newestEntry);
assert.equal(cache.get(4).isFinished, true);
assert.equal(inFlight.size, 0);
assert.equal(cacheWriters.size, 0);

console.log("PASS: older response cannot overwrite newer cache");



console.log("No real API requests or database connections were made.");