import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source = fs
  .readFileSync(
    new URL("../src/services/footballClient.js", import.meta.url),
    "utf8",
  )
  .replace(/import axios from ["']axios["'];?/, "")
  .replace("export function footballGet", "function footballGet");

let now = 0;
const calls = [];

class FakeDate extends Date {
  static now() {
    return now;
  }
}

const context = vm.createContext({
  Date: FakeDate,
  process: {
    env: { FOOTBALL_DATA_KEY: "test-key-not-real" },
  },
  setTimeout(resolve, delay) {
    now += delay;
    resolve();
  },
  axios: {
    create() {
      return {
        async get(path) {
          calls.push({ path, at: now });

          if (path === "/fail") {
            throw new Error("Simulated network failure");
          }

          if (path === "/limited") {
            const error = new Error("Simulated rate limit");
            error.response = {
              status: 429,
              headers: { "retry-after": "90" },
            };
            throw error;
          }

          return { data: { path } };
        },
      };
    },
  },
});

vm.runInContext(source, context);
const get = context.footballGet;

// Requests remain ordered and spaced.
await Promise.all([get("/a"), get("/b"), get("/c")]);

assert.deepEqual(
  calls.map((call) => call.path),
  ["/a", "/b", "/c"],
);

for (let i = 1; i < calls.length; i++) {
  assert.ok(calls[i].at - calls[i - 1].at >= 8_000);
}
console.log("PASS: request order and spacing");

// A failed request must not break the queue.
await assert.rejects(get("/fail"));
await get("/after-failure");
console.log("PASS: queue continues after failure");

// Provider cooldown must delay the next request.
await assert.rejects(get("/limited"));
const limitedAt = calls.at(-1).at;

await get("/after-limit");
assert.ok(calls.at(-1).at - limitedAt >= 90_000);
console.log("PASS: Retry-After cooldown");

// The 21st outstanding request must be rejected.
const results = await Promise.allSettled(
  Array.from({ length: 21 }, (_, i) => get(`/batch/${i}`)),
);

assert.equal(
  results.filter((result) => result.status === "fulfilled").length,
  20,
);
assert.equal(results[20].status, "rejected");
assert.equal(results[20].reason.code, "FOOTBALL_QUEUE_FULL");

await get("/after-batch");
console.log("PASS: queue limit and recovery");

console.log("All checks passed. No real API requests were made.");