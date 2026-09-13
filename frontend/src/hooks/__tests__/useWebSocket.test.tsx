import { StrictMode, useState, type ReactNode } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider, onlineManager, useQuery } from "@tanstack/react-query";
import { useWebSocket } from "../useWebSocket";
import { MockWebSocket } from "@/test/mockWebSocket";

const FLUSH = 400;

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
}

function Owner() {
  useWebSocket();
  return null;
}

let invalidateSpy: ReturnType<typeof vi.spyOn>;

function setup(children: ReactNode, client = makeClient()) {
  invalidateSpy = vi.spyOn(client, "invalidateQueries");
  const utils = render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <Owner />
        {children}
      </QueryClientProvider>
    </StrictMode>,
  );
  return { client, ...utils };
}

function invalidatedKeys(): string[] {
  const calls = invalidateSpy.mock.calls as unknown as Array<[{ queryKey?: unknown } | undefined]>;
  return calls.map((c) => JSON.stringify(c[0]?.queryKey));
}

beforeEach(() => {
  MockWebSocket.reset();
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.useFakeTimers({ shouldAdvanceTime: false });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  onlineManager.setOnline(true);
});

async function flushMicro() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useWebSocket lifecycle", () => {
  it("StrictMode leaves exactly one live connection and no orphan timers after unmount", async () => {
    const { unmount } = setup(null);
    await advance(1);
    expect(MockWebSocket.live).toHaveLength(1);

    act(() => unmount());
    expect(MockWebSocket.live).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not subscribe for a disabled query and recomputes when enabled toggles", async () => {
    let setEnabled!: (v: boolean) => void;
    function Detail() {
      const [enabled, set] = useState(false);
      setEnabled = set;
      useQuery({
        queryKey: ["match", "650"],
        queryFn: async () => ({ id: "650" }),
        enabled,
      });
      return null;
    }
    setup(<Detail />);
    await advance(1);
    const ws = MockWebSocket.live[0];
    act(() => ws.open());
    await advance(1);
    expect([...ws.subscriptions]).toEqual([]);

    await act(async () => {
      setEnabled(true);
    });
    await advance(1);
    expect([...ws.subscriptions]).toEqual([650]);
  });

  it("dedupes across list + detail and retains ids still needed after one source unmounts", async () => {
    function List() {
      useQuery({
        queryKey: ["matches"],
        queryFn: async () => [{ id: "650" }, { id: "651" }],
      });
      return null;
    }
    function Detail() {
      useQuery({ queryKey: ["match", "650"], queryFn: async () => ({ id: "650" }) });
      return null;
    }
    function Screen() {
      const [showList, setShow] = useState(true);
      (globalThis as Record<string, unknown>).__hideList = () => setShow(false);
      return (
        <>
          {showList && <List />}
          <Detail />
        </>
      );
    }
    setup(<Screen />);
    await advance(1);
    const ws = MockWebSocket.live[0];
    act(() => ws.open());
    await advance(10);
    expect([...ws.subscriptions].sort()).toEqual([650, 651]);

    await act(async () => {
      ((globalThis as Record<string, unknown>).__hideList as () => void)();
    });
    await advance(10);
    expect([...ws.subscriptions]).toEqual([650]);
    expect(ws.sent.some((m) => m.type === "unsubscribe" && m.matchId === 651)).toBe(true);
  });

  it("ignores callbacks from a retired socket and reconnects with resubscription", async () => {
    function Detail() {
      useQuery({ queryKey: ["match", "650"], queryFn: async () => ({ id: "650" }) });
      return null;
    }
    setup(<Detail />);
    await advance(1);
    const first = MockWebSocket.live[0];
    act(() => first.open());
    await advance(FLUSH + 10);
    invalidateSpy.mockClear();

    act(() => first.close());
    // a late message from the closed socket must be ignored
    act(() => first.emit({ type: "score_update", data: { matchId: 650 } }));
    await advance(FLUSH + 10);
    expect(invalidateSpy).not.toHaveBeenCalled();

    await advance(1000); // backoff
    const second = MockWebSocket.live[0];
    expect(second).not.toBe(first);
    act(() => second.open());
    await advance(10);
    expect([...second.subscriptions]).toEqual([650]);

    // recovery refresh after reconnect, batched
    await advance(FLUSH + 10);
    expect(invalidatedKeys()).toEqual(expect.arrayContaining(['["matches"]', '["match","650"]']));
  });

  it("coalesces a burst into a bounded flush and never touches provider-backed keys", async () => {
    function Screen() {
      useQuery({ queryKey: ["matches"], queryFn: async () => [{ id: "650" }] });
      useQuery({ queryKey: ["match", "650"], queryFn: async () => ({ id: "650" }) });
      useQuery({ queryKey: ["standings", "PL"], queryFn: async () => ({}) });
      useQuery({ queryKey: ["scorers", "PL"], queryFn: async () => ({}) });
      useQuery({ queryKey: ["match", "650", "events"], queryFn: async () => ({}) });
      return null;
    }
    setup(<Screen />);
    await advance(1);
    const ws = MockWebSocket.live[0];
    act(() => ws.open());
    await advance(FLUSH + 10);
    invalidateSpy.mockClear();

    act(() => {
      for (let i = 0; i < 25; i++) {
        ws.emit({ type: "score_update", data: { matchId: 650, homeScore: i } });
      }
      ws.emit({ type: "match_created", data: { id: 999 } });
      ws.emit({ type: "welcome" });
      ws.emit({ type: "unsubscribed", matchId: 650 });
      ws.emit("garbage{");
    });
    await advance(FLUSH + 10);

    const keys: string[] = invalidatedKeys();
    expect(keys.filter((k) => k === '["match","650"]')).toHaveLength(1);
    expect(keys.filter((k) => k === '["matches"]')).toHaveLength(1);
    expect(keys.some((k) => /standings|scorers|events|commentary/.test(k))).toBe(false);
  });

  it("does not restart a slow in-flight fetch and schedules a follow-up refresh", async () => {
    let calls = 0;
    let release!: () => void;
    function Detail() {
      useQuery({
        queryKey: ["match", "650"],
        queryFn: () => {
          calls += 1;
          return new Promise<{ id: string }>((resolve) => {
            release = () => resolve({ id: "650" });
          });
        },
      });
      return null;
    }
    setup(<Detail />);
    await advance(1);
    const ws = MockWebSocket.live[0];
    act(() => ws.open());
    await advance(FLUSH + 10);
    expect(calls).toBe(1); // still fetching, not cancelled/restarted

    act(() => {
      for (let i = 0; i < 10; i++) {
        ws.emit({ type: "score_update", data: { matchId: 650, homeScore: i } });
      }
    });
    await advance(FLUSH * 3);
    expect(calls).toBe(1); // continuous updates never starve the slow fetch

    await act(async () => {
      release();
      await Promise.resolve();
    });
    await advance(FLUSH * 2);
    expect(calls).toBeGreaterThan(1); // update received mid-fetch is not lost
  });

  it("subscription acknowledgement for an unknown id is ignored", async () => {
    function Detail() {
      useQuery({ queryKey: ["match", "650"], queryFn: async () => ({ id: "650" }) });
      return null;
    }
    setup(<Detail />);
    await advance(1);
    const ws = MockWebSocket.live[0];
    act(() => ws.open());
    await advance(FLUSH + 10);
    invalidateSpy.mockClear();

    act(() => ws.emit({ type: "subscribed", matchId: 4242 }));
    await advance(FLUSH + 10);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useWebSocket pending-update regressions", () => {
  function activeRefetches(key: string): number {
    const calls = invalidateSpy.mock.calls as unknown as Array<
      [{ queryKey?: unknown; refetchType?: string } | undefined]
    >;
    return calls.filter(
      (c) => JSON.stringify(c[0]?.queryKey) === key && c[0]?.refetchType === "active",
    ).length;
  }

  it("keeps a pending update for a 60s in-flight request and runs exactly one follow-up", async () => {
    let calls = 0;
    let release!: () => void;
    function Detail() {
      useQuery({
        queryKey: ["match", "650"],
        queryFn: () => {
          calls += 1;
          return new Promise<{ id: string }>((resolve) => {
            release = () => resolve({ id: "650" });
          });
        },
      });
      return null;
    }
    setup(<Detail />);
    await advance(1);
    const ws = MockWebSocket.live[0];
    act(() => ws.open());
    await advance(FLUSH + 10);
    invalidateSpy.mockClear();

    act(() => ws.emit({ type: "score_update", data: { matchId: 650, homeScore: 1 } }));
    await advance(60_000);
    expect(calls).toBe(1); // still in flight, never restarted
    expect(activeRefetches('["match","650"]')).toBe(0);

    await act(async () => {
      release();
      await Promise.resolve();
    });
    await advance(FLUSH * 3);
    expect(calls).toBe(2); // exactly one follow-up refresh
    expect(activeRefetches('["match","650"]')).toBe(1);
  });

  it("retains a pending update for a paused request until it resumes", async () => {
    let calls = 0;
    function Detail() {
      useQuery({
        queryKey: ["match", "650"],
        queryFn: async () => {
          calls += 1;
          return { id: "650" };
        },
      });
      return null;
    }
    onlineManager.setOnline(false);
    setup(<Detail />);
    await advance(1);
    const ws = MockWebSocket.live[0];
    act(() => ws.open());
    await advance(FLUSH + 10);
    expect(calls).toBe(0); // paused while offline
    invalidateSpy.mockClear();

    act(() => ws.emit({ type: "score_update", data: { matchId: 650, homeScore: 1 } }));
    await advance(5_000);
    expect(activeRefetches('["match","650"]')).toBe(0); // marker retained, not dropped

    await act(async () => {
      onlineManager.setOnline(true);
      await Promise.resolve();
    });
    await advance(FLUSH * 3);
    expect(activeRefetches('["match","650"]')).toBe(1);
    expect(calls).toBeGreaterThan(0);
  });

  it("does not loop endlessly when the follow-up refresh fails", async () => {
    let calls = 0;
    function Detail() {
      useQuery({
        queryKey: ["match", "650"],
        queryFn: async () => {
          calls += 1;
          throw new Error("boom");
        },
        retry: false,
      });
      return null;
    }
    setup(<Detail />);
    await advance(1);
    const ws = MockWebSocket.live[0];
    act(() => ws.open());
    await advance(FLUSH * 3);
    const afterMount = calls;

    act(() => ws.emit({ type: "score_update", data: { matchId: 650 } }));
    await advance(FLUSH * 3);
    const afterUpdate = calls;
    expect(afterUpdate).toBe(afterMount + 1);

    await advance(30_000);
    expect(calls).toBe(afterUpdate); // no automatic refetch loop
  });

  it("a stale socket close callback leaves the new connection's subscriptions intact", async () => {
    function Detail() {
      useQuery({ queryKey: ["match", "650"], queryFn: async () => ({ id: "650" }) });
      return null;
    }
    setup(<Detail />);
    await advance(1);
    const first = MockWebSocket.live[0];
    act(() => first.open());
    await advance(10);
    const staleClose = first.onclose!;

    act(() => first.close());
    await advance(1000);
    const second = MockWebSocket.live[0];
    expect(second).not.toBe(first);
    act(() => second.open());
    await advance(10);
    expect([...second.subscriptions]).toEqual([650]);
    const sentBefore = second.sent.length;
    const socketsBefore = MockWebSocket.instances.length;

    act(() => staleClose());
    await advance(60_000);

    expect([...second.subscriptions]).toEqual([650]);
    expect(second.sent.length).toBe(sentBefore); // no duplicate subscribe
    expect(MockWebSocket.instances.length).toBe(socketsBefore); // no extra reconnect
    expect(MockWebSocket.live).toHaveLength(1);
  });
});
