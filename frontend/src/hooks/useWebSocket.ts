import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import {
  collectDesiredSubscriptions,
  diffSubscriptions,
  isRelevantKey,
  parseServerMessage,
} from "./websocketMessages";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";
const FLUSH_WINDOW_MS = 400;
const MAX_BACKOFF_MS = 30_000;

/**
 * Single WebSocket owner. Mount once (Layout).
 * - Subscribes to match ids needed by active match list/detail queries.
 * - score_update / match_created are invalidation signals only; the REST
 *   representation is refetched instead of patching cached Match objects.
 */
export function useWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const client = queryClient;

    let disposed = false;
    let socket: WebSocket | null = null;
    let generation = 0;
    let retries = 0;
    let reconnectTimer: number | null = null;
    let recomputeTimer: number | null = null;
    let flushTimer: number | null = null;

    /** ids subscribed on the *current* connection */
    let sent = new Set<number>();

    /** Deduplicated dirty markers: relevant query keys awaiting a refresh. */
    const pendingDetailIds = new Set<string>();
    let pendingMatches = false;

    const findQuery = (key: QueryKey) =>
      client.getQueryCache().find({ queryKey: key, exact: true });

    /** A request that is fetching or paused (offline) must not be disturbed. */
    const isBusy = (key: QueryKey) => {
      const status = findQuery(key)?.state.fetchStatus;
      return status === "fetching" || status === "paused";
    };

    /**
     * Marks the query stale and refetches active observers without cancelling a
     * slow in-flight request (cancelRefetch: false).
     */
    const invalidate = (key: QueryKey, refetch: boolean) =>
      client.invalidateQueries(
        { queryKey: key, exact: true, refetchType: refetch ? "active" : "none" },
        { cancelRefetch: false },
      );

    const hasPending = (key: QueryKey) =>
      Array.isArray(key) && key[0] === "matches"
        ? pendingMatches
        : pendingDetailIds.has(String((key as unknown[])[1]));

    const clearPending = (key: QueryKey) => {
      if (Array.isArray(key) && key[0] === "matches") pendingMatches = false;
      else pendingDetailIds.delete(String((key as unknown[])[1]));
    };

    /**
     * Consumes the marker *before* refetching, so an update arriving during the
     * follow-up request marks the key dirty again instead of being swallowed.
     * While the query is busy the marker is retained and the key is only marked
     * stale; a cache lifecycle event reschedules the flush once it goes idle.
     */
    const settle = (key: QueryKey) => {
      if (isBusy(key)) {
        invalidate(key, false); // mark stale only; do not restart the fetch
        return;
      }
      clearPending(key);
      invalidate(key, true);
    };

    const flush = () => {
      flushTimer = null;
      for (const id of [...pendingDetailIds]) settle(["match", id]);
      if (pendingMatches) settle(["matches"]);
    };

    /** Fixed window: continuous traffic cannot postpone the flush. */
    const scheduleFlush = () => {
      if (flushTimer !== null || disposed) return;
      flushTimer = window.setTimeout(flush, FLUSH_WINDOW_MS);
    };

    const queueDetail = (matchId: number) => {
      pendingDetailIds.add(String(matchId));
      scheduleFlush();
    };
    const queueMatches = () => {
      pendingMatches = true;
      scheduleFlush();
    };

    const refreshAllActive = () => {
      queueMatches();
      for (const id of collectDesiredSubscriptions(client)) queueDetail(id);
    };

    const send = (ws: WebSocket, payload: unknown) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
    };

    const syncSubscriptions = () => {
      const ws = socket;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const desired = collectDesiredSubscriptions(client);
      const { toSubscribe, toUnsubscribe } = diffSubscriptions(desired, sent);
      for (const matchId of toUnsubscribe) {
        send(ws, { type: "unsubscribe", matchId });
        sent.delete(matchId);
      }
      for (const matchId of toSubscribe) {
        send(ws, { type: "subscribe", matchId });
        sent.add(matchId);
      }
    };

    /** Cache listener only schedules a recompute — never invalidates directly. */
    const scheduleRecompute = () => {
      if (disposed || recomputeTimer !== null) return;
      recomputeTimer = window.setTimeout(() => {
        recomputeTimer = null;
        syncSubscriptions();
      }, 0);
    };

    /**
     * Prunes markers for removed/inactive queries and reschedules the flush when
     * a query holding a marker becomes idle again.
     */
    const reviewPending = (event: { type: string; query?: { queryKey: QueryKey } }) => {
      const key = event.query?.queryKey;
      if (!key || !hasPending(key)) return;
      if (event.type === "removed") {
        clearPending(key);
        return;
      }
      const query = findQuery(key);
      if (!query) {
        clearPending(key);
        return;
      }
      if (!query.isActive()) {
        clearPending(key);
        invalidate(key, false); // stale only; nothing is observing it
        return;
      }
      if (!isBusy(key)) scheduleFlush();
    };

    const unsubscribeCache = client.getQueryCache().subscribe((event) => {
      if (!isRelevantKey(event.query?.queryKey)) return;
      switch (event.type) {
        case "added":
        case "removed":
        case "updated":
        case "observerAdded":
        case "observerRemoved":
        case "observerOptionsUpdated":
          reviewPending(event);
          scheduleRecompute();
          break;
        default:
          break;
      }
    });

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== null) return;
      const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** retries);
      retries += 1;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed) return;
      const myGeneration = ++generation;
      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        scheduleReconnect();
        return;
      }
      socket = ws;

      /** Handlers are bound to this exact instance and generation. */
      const isStale = () => disposed || myGeneration !== generation || socket !== ws;

      /** Only the *current* socket may clear the live subscription state. */
      const retire = () => {
        if (socket !== ws) return;
        socket = null;
        sent = new Set();
      };

      ws.onopen = () => {
        if (isStale()) {
          ws.close();
          return;
        }
        retries = 0;
        sent = new Set();
        syncSubscriptions();
        // Recover updates missed while disconnected.
        refreshAllActive();
      };

      ws.onmessage = (evt: MessageEvent) => {
        if (isStale()) return;
        const message = parseServerMessage(evt.data);
        if (!message) return;
        switch (message.type) {
          case "score_update":
            queueDetail(message.data.matchId);
            queueMatches();
            break;
          case "match_created":
            queueMatches();
            break;
          case "subscribed": {
            // Close the initial fetch/subscription gap, but only for ids still
            // subscribed on this connection and still desired.
            if (!sent.has(message.matchId)) break;
            if (!collectDesiredSubscriptions(client).has(message.matchId)) break;
            queueDetail(message.matchId);
            queueMatches();
            break;
          }
          case "welcome":
          case "unsubscribed":
            break;
        }
      };

      ws.onclose = () => {
        if (isStale()) return; // a retired socket must not touch live state
        retire();
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (isStale()) return;
        ws.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      generation += 1;
      unsubscribeCache();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (recomputeTimer !== null) window.clearTimeout(recomputeTimer);
      if (flushTimer !== null) window.clearTimeout(flushTimer);
      reconnectTimer = null;
      recomputeTimer = null;
      flushTimer = null;
      const ws = socket;
      socket = null;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
      sent = new Set();
      pendingDetailIds.clear();
      pendingMatches = false;
    };
  }, [queryClient]);
}
