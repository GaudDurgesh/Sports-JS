import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import vm from "node:vm";

const source = readFileSync(
  new URL("../src/ws/server.js", import.meta.url),
  "utf8",
);

const start = source.indexOf("const matchSubscribers");
assert.ok(start >= 0, "Cannot locate WebSocket implementation");

class FakeWebSocketServer extends EventEmitter {
  clients = new Set();
}

const context = vm.createContext({
  WebSocket: { OPEN: 1 },
  WebSocketServer: FakeWebSocketServer,
  wsArcjet: null,
  console,
  URL,
  setInterval: () => 1,
  clearInterval: () => {},
});

vm.runInContext(
  source.slice(start).replace(
    "export function attachWebSocketServer",
    "function attachWebSocketServer",
  ) + `
    globalThis.api = {
      attachWebSocketServer,
      handleMessage,
      cleanupSubscriptions
    };
  `,
  context,
);

const api = context.api;
const { broadcastScoreUpdate } =
  api.attachWebSocketServer(new EventEmitter());

function makeSocket() {
  return {
    readyState: 1,
    subscriptions: new Set(),
    messages: [],
    send(text) {
      this.messages.push(JSON.parse(text));
    },
  };
}

const first = makeSocket();
const other = makeSocket();

function message(socket, payload) {
  api.handleMessage(socket, JSON.stringify(payload));
}

message(first, { type: "subscribe", matchId: 650 });
assert.equal(first.messages.at(-1).type, "subscribed");

message(first, { type: "subscribe", matchId: 650 });
message(other, { type: "subscribe", matchId: 651 });
first.messages.length = 0;
other.messages.length = 0;

broadcastScoreUpdate({
  matchId: 650,
  homeScore: 2,
  awayScore: 1,
});

assert.deepEqual(first.messages, [{
  type: "score_update",
  data: { matchId: 650, homeScore: 2, awayScore: 1 },
}]);
assert.equal(other.messages.length, 0);
console.log("PASS: object argument produces correct nested message");
console.log("PASS: duplicate subscription delivers once; other match excluded");

message(first, { type: "unsubscribe", matchId: 650 });
first.messages.length = 0;
broadcastScoreUpdate({ matchId: 650, homeScore: 3, awayScore: 1 });
assert.equal(first.messages.length, 0);
console.log("PASS: unsubscribe stops delivery");

message(first, { type: "subscribe", matchId: 650 });
api.cleanupSubscriptions(first);
first.messages.length = 0;
broadcastScoreUpdate({ matchId: 650, homeScore: 4, awayScore: 1 });
assert.equal(first.messages.length, 0);
console.log("PASS: subscription cleanup stops delivery");

for (const matchId of ["650", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
  assert.throws(
    () => broadcastScoreUpdate({ matchId, homeScore: 0, awayScore: 0 }),
    /positive integer matchId/,
  );
}
console.log("PASS: invalid outgoing match IDs rejected");
console.log("No network requests or database connections were made.");