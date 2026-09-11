import assert from "node:assert/strict";
import { normalizeFootballEvents } from "../src/services/normalizeFootballEvents.js";

const fixture = {
  homeTeam: { id: 1 },
  awayTeam: { id: 2 },
  goals: [
    {
      minute: 45,
      injuryTime: 2,
      team: { id: 1 },
      scorer: { id: 10, name: "Player A" },
      type: "OWN_GOAL",
    },
  ],
  bookings: [
    {
      minute: 12,
      team: { id: 2 },
      player: { id: 20, name: "Player B" },
      card: "YELLOW_RED",
    },
  ],
  substitutions: [],
};

const result = normalizeFootballEvents(fixture, "123");

assert.equal(result.coverage, "complete");
assert.equal(result.events.length, 2);
assert.equal(result.events[0].type, "red_card");
assert.equal(result.events[0].team, "away");
assert.equal(result.events[1].message, "Own goal");
assert.equal(result.events[1].metadata.addedTime, 2);
assert.equal(new Set(result.events.map((event) => event.id)).size, 2);

assert.deepEqual(
  result,
  normalizeFootballEvents(fixture, "123"),
);

assert.equal(
  normalizeFootballEvents({}, "123").coverage,
  "unavailable",
);

assert.equal(
  normalizeFootballEvents({ goals: [] }, "123").coverage,
  "partial",
);

assert.throws(() =>
  normalizeFootballEvents({ goals: {} }, "123"),
);

console.log("PASS: event mapping, ordering, identity and missing-data checks");
console.log("No API requests or database connections were made.");