import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Match } from "@/types";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

interface ScoreUpdate {
  type: "score_update" | "goal" | "wicket" | string;
  matchId: string;
  match?: Match;
  message?: string;
}

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;

    const connect = () => {
      if (closedRef.current) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
      };
      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data) as ScoreUpdate;
          if (payload.matchId && payload.match) {
            queryClient.setQueryData(["match", payload.matchId], payload.match);
            queryClient.invalidateQueries({ queryKey: ["matches"] });
          } else if (payload.matchId) {
            queryClient.invalidateQueries({ queryKey: ["match", payload.matchId] });
            queryClient.invalidateQueries({ queryKey: ["matches"] });
          }
          if (payload.type === "goal") {
            toast(`⚽ Goal! ${payload.message ?? ""}`);
          } else if (payload.type === "wicket") {
            toast(`🏏 Wicket! ${payload.message ?? ""}`);
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (!closedRef.current) scheduleReconnect();
      };
      ws.onerror = () => {
        ws.close();
      };
    };

    const scheduleReconnect = () => {
      const delay = Math.min(30_000, 1000 * 2 ** retryRef.current);
      retryRef.current += 1;
      timerRef.current = window.setTimeout(connect, delay);
    };

    connect();

    return () => {
      closedRef.current = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [queryClient]);
}
