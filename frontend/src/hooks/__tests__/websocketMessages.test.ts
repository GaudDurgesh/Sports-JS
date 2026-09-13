import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  parseServerMessage,
  toWireMatchId,
  isMatchListKey,
  isMatchDetailKey,
  collectDesiredSubscriptions,
  diffSubscriptions,
} from "../websocketMessages";

describe("toWireMatchId", () => {
  it("accepts positive safe integers and canonical decimal strings", () => {
    expect(toWireMatchId(650)).toBe(650);
    expect(toWireMatchId("650")).toBe(650);
  });

  it("rejects non-canonical or unsafe ids", () => {
    for (const bad of [
      0,
      -1,
      1.5,
      NaN,
      Number.MAX_SAFE_INTEGER + 2,
      "0650",
      "0",
      " 650",
      "650 ",
      "6.5e2",
      "0x28a",
      "",
      "abc",
      null,
      undefined,
      {},
    ]) {
      expect(toWireMatchId(bad)).toBeNull();
    }
  });
});

describe("key shapes", () => {
  it("only accepts exact shapes", () => {
    expect(isMatchListKey(["matches"])).toBe(true);
    expect(isMatchListKey(["matches", "live"])).toBe(false);
    expect(isMatchDetailKey(["match", "650"])).toBe(true);
    expect(isMatchDetailKey(["match"])).toBe(false);
    expect(isMatchDetailKey(["match", "650", "events"])).toBe(false);
  });
});

describe("parseServerMessage", () => {
  it("parses supported messages", () => {
    expect(parseServerMessage('{"type":"welcome"}')?.type).toBe("welcome");
    expect(parseServerMessage('{"type":"subscribed","matchId":650}')).toEqual({
      type: "subscribed",
      matchId: 650,
    });
    const su = parseServerMessage(
      '{"type":"score_update","data":{"matchId":650,"homeScore":2,"awayScore":1}}',
    );
    expect(su?.type === "score_update" && su.data.matchId).toBe(650);
    expect(parseServerMessage('{"type":"match_created","data":{"x":1}}')?.type).toBe(
      "match_created",
    );
  });

  it("rejects malformed, unsupported and top-level score payloads", () => {
    expect(parseServerMessage("not json")).toBeNull();
    expect(parseServerMessage('{"type":"other"}')).toBeNull();
    expect(parseServerMessage('{"type":"score_update","matchId":650}')).toBeNull();
    expect(parseServerMessage('{"type":"score_update","data":{"matchId":"650"}}')).toBeNull();
    expect(parseServerMessage('{"type":"subscribed","matchId":-3}')).toBeNull();
  });
});

describe("collectDesiredSubscriptions", () => {
  it("dedupes active list + detail ids and ignores inactive/invalid", () => {
    const client = new QueryClient();
    const cache = client.getQueryCache();

    const list = cache.build(client, { queryKey: ["matches"] });
    list.setData([{ id: "650" }, { id: "651" }, { id: "0651" }, { id: null }]);
    list.addObserver({ options: {} } as never);

    const detail = cache.build(client, { queryKey: ["match", "650"] });
    detail.addObserver({ options: {} } as never);

    const inactive = cache.build(client, { queryKey: ["match", "999"] });
    inactive.setData({ id: "999" });

    const wrongShape = cache.build(client, { queryKey: ["match", "888", "events"] });
    wrongShape.addObserver({ options: {} } as never);

    expect([...collectDesiredSubscriptions(client)].sort()).toEqual([650, 651]);
  });

  it("retains ids still needed by another source", () => {
    const client = new QueryClient();
    const cache = client.getQueryCache();
    const list = cache.build(client, { queryKey: ["matches"] });
    list.setData([{ id: 650 }, { id: 651 }]);
    const listObserver = { options: {} } as never;
    list.addObserver(listObserver);
    const detail = cache.build(client, { queryKey: ["match", "650"] });
    detail.addObserver({ options: {} } as never);

    expect([...collectDesiredSubscriptions(client)].sort()).toEqual([650, 651]);
    list.removeObserver(listObserver);
    expect([...collectDesiredSubscriptions(client)]).toEqual([650]);
  });
});

describe("diffSubscriptions", () => {
  it("computes only the needed deltas", () => {
    expect(diffSubscriptions(new Set([1, 2]), new Set([2, 3]))).toEqual({
      toSubscribe: [1],
      toUnsubscribe: [3],
    });
  });
});
