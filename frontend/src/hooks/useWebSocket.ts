import { useEffect, useRef, useState, useCallback } from "react";
import type { Match, Commentary } from "../types";

interface ScoreUpdate {
  matchId: number;
  homeScore: number;
  awayScore: number;
}

interface MatchCreatedPayload {
  matchId: number;
  match: Match;
}

interface UseWebSocketOptions {
  matchId?: number | null;
  onScoreUpdate?: (update: ScoreUpdate) => void;
  onCommentary?: (commentary: Commentary) => void;
  onMatchCreated?: (payload: MatchCreatedPayload) => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";
const MAX_RETRY_DELAY = 30000;
const BASE_RETRY_DELAY = 1000;

export function useWebSocket({
  matchId,
  onScoreUpdate,
  onCommentary,
  onMatchCreated,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const matchIdRef = useRef(matchId);

  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onCommentaryRef = useRef(onCommentary);
  const onMatchCreatedRef = useRef(onMatchCreated);

  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
    onCommentaryRef.current = onCommentary;
    onMatchCreatedRef.current = onMatchCreated;
  });

  const getRetryDelay = useCallback((attempt: number) => {
    return Math.min(BASE_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
  }, []);

  // No longer depends on matchId — the socket itself is stable
  // across matchId changes. Reads matchIdRef for the initial subscribe.
  const connect = useCallback(() => {
    if (!shouldReconnectRef.current) return;

    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      retryCountRef.current = 0;
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case "welcome":
            if (matchIdRef.current != null) {
              ws.send(JSON.stringify({ type: "subscribe", matchId: matchIdRef.current }));
            }
            break;
          case "score_update":
            onScoreUpdateRef.current?.(message.data);
            break;
          case "commentary":
            onCommentaryRef.current?.(message.data);
            break;
          case "match_created":
            onMatchCreatedRef.current?.(message.data);
            break;
        }
      } catch {
        console.error("Failed to parse WebSocket message");
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;
      if (!shouldReconnectRef.current) return;

      const delay = getRetryDelay(retryCountRef.current);
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, [getRetryDelay]);

  // Socket lifecycle — mount/unmount only
  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      socketRef.current?.close();
    };
  }, [connect]);

  // Subscription lifecycle — runs on matchId change,
  // sends subscribe/unsubscribe over the EXISTING socket
  useEffect(() => {
    matchIdRef.current = matchId;

    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN && matchId != null) {
      ws.send(JSON.stringify({ type: "subscribe", matchId }));
    }

    return () => {
      const currentWs = socketRef.current;
      if (currentWs?.readyState === WebSocket.OPEN && matchId != null) {
        currentWs.send(JSON.stringify({ type: "unsubscribe", matchId }));
      }
    };
  }, [matchId]);

  return { isConnected };
}