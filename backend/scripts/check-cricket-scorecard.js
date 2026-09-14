import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeCricketScorecard } from "../src/services/normalizeCricketScorecard.js";

const raw = JSON.parse(
  readFileSync(
    new URL("./fixtures/cricket-scorecard-169360.json", import.meta.url),
    "utf8",
  ),
);

const original = JSON.stringify(raw);
const result = normalizeCricketScorecard(raw);

assert.equal(result.complete, true);
assert.equal(result.result, "Belfast Wolves won by 5 wkts");
assert.deepEqual(
  result.innings.map((i) => [i.teamName, i.runs, i.wickets, i.overs]),
  [
    ["Amsterdam Flames", 141, 10, "20"],
    ["Belfast Wolves", 144, 5, "19"],
  ],
);
console.log("PASS: result and innings totals");

const batter = result.innings[0].batting.find((p) => p.name === "Yuvraj Samra");
assert.equal(batter.runs, 2);
assert.equal(batter.balls, 5);
assert.equal(batter.dismissal, "c Mark Chapman b Saurabh Netravalkar");

const bowler = result.innings[0].bowling.find((p) => p.name === "Mark Adair");
assert.equal(bowler.wickets, 3);
assert.equal(bowler.runs, 25);
assert.equal(bowler.overs, "4");
console.log("PASS: batting, dismissal and bowling mapping");

const david = result.innings[1].batting.find((p) => p.name === "David Miller");
const mark = result.innings[1].batting.find((p) => p.name === "Mark Adair");
assert.equal(david.dismissal, "not out");
assert.equal(mark.dismissal, null);
console.log("PASS: missing dismissal stays distinct from not out");

const missing = structuredClone(raw);
delete missing.scorecard[0].batting;
delete missing.scorecard[0].batsman;
missing.scorecard[0].bowler = [];
const partial = normalizeCricketScorecard(missing);
assert.equal(partial.innings[0].batting, null);
assert.deepEqual(partial.innings[0].bowling, []);
console.log("PASS: missing and empty sections stay distinct");

for (const mutate of [
  (d) => {
    delete d.ismatchcomplete;
  },
  (d) => {
    d.scorecard[0].score = -1;
  },
  (d) => {
    d.scorecard[0].batsman[0].balls = 1.5;
  },
  (d) => {
    d.scorecard[0].bowler = {};
  },
  (d) => {
    d.scorecard[1].inningsid = d.scorecard[0].inningsid;
  },
]) {
  const invalid = structuredClone(raw);
  mutate(invalid);
  assert.throws(() => normalizeCricketScorecard(invalid));
}
console.log("PASS: malformed data rejected");

assert.equal(JSON.stringify(raw), original);
console.log("PASS: original provider response unchanged");
assert.deepEqual(result.innings[0].extras, {
  byes: 0,
  legByes: 2,
  wides: 4,
  noBalls: 0,
  penalty: 0,
  total: 6,
});

assert.equal(result.innings[1].extras.total, 3);

for (const innings of result.innings) {
  const batterRuns = innings.batting.reduce(
    (total, player) => total + player.runs,
    0,
  );
  assert.equal(batterRuns + innings.extras.total, innings.runs);
}
console.log("PASS: fixture batting runs plus extras match innings totals");

const noExtras = structuredClone(raw);
delete noExtras.scorecard[0].extras;
assert.equal(normalizeCricketScorecard(noExtras).innings[0].extras, null);

const partialExtras = structuredClone(raw);
delete partialExtras.scorecard[0].extras.wides;
assert.equal(
  normalizeCricketScorecard(partialExtras).innings[0].extras.wides,
  null,
);

const invalidExtras = structuredClone(raw);
invalidExtras.scorecard[0].extras.total = -1;
assert.throws(() => normalizeCricketScorecard(invalidExtras), /extras/);
console.log("PASS: missing extras preserved; invalid extras rejected");

const firstInnings = result.innings[0];

assert.equal(firstInnings.fallOfWickets.length, 10);
assert.deepEqual(firstInnings.fallOfWickets[0], {
  playerId: 1424075,
  name: "Yuvraj Samra",
  teamRuns: 7,
  delivery: "1.4",
});
assert.equal(firstInnings.fallOfWickets.at(-1).delivery, "19.6");
assert.equal(result.innings[1].fallOfWickets.length, 5);
console.log("PASS: fall of wickets preserves team score and delivery");

const partnership = firstInnings.partnerships[0];
assert.equal(partnership.runs, 7);
assert.equal(partnership.balls, 10);
assert.deepEqual(
  partnership.batters.map((p) => [p.name, p.runs, p.balls]),
  [
    ["Yuvraj Samra", 2, 5],
    ["Steven Smith", 3, 5],
  ],
);
console.log("PASS: partnership total and individual contributions preserved");

const missingSections = structuredClone(raw);
delete missingSections.scorecard[0].fow;
delete missingSections.scorecard[0].partnership;
const missingResult = normalizeCricketScorecard(missingSections);
assert.equal(missingResult.innings[0].fallOfWickets, null);
assert.equal(missingResult.innings[0].partnerships, null);

const emptySections = structuredClone(raw);
emptySections.scorecard[0].fow = { fow: [] };
emptySections.scorecard[0].partnership = { partnership: [] };
const emptyResult = normalizeCricketScorecard(emptySections);
assert.deepEqual(emptyResult.innings[0].fallOfWickets, []);
assert.deepEqual(emptyResult.innings[0].partnerships, []);

const malformed = structuredClone(raw);
malformed.scorecard[0].partnership = { partnership: {} };
assert.throws(() => normalizeCricketScorecard(malformed));

const invalidDelivery = structuredClone(raw);
invalidDelivery.scorecard[0].fow.fow[0].overnbr = "1.9";
assert.throws(() => normalizeCricketScorecard(invalidDelivery));

console.log(
  "PASS: missing/empty sections distinguished; malformed data rejected",
);

console.log("No API requests or database connections were made.");
