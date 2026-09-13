/** Minimal controllable WebSocket double for lifecycle tests. */
export class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static reset() {
    MockWebSocket.instances = [];
  }
  static get live() {
    return MockWebSocket.instances.filter((w) => w.readyState !== 3);
  }
  static get last() {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  url: string;
  readyState = 0;
  sent: Array<{ type: string; matchId?: number }> = [];
  onopen: (() => void) | null = null;
  onmessage: ((evt: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }

  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.();
  }

  /** simulate a successful handshake */
  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  /** simulate a server message (object or raw string) */
  emit(payload: unknown) {
    const data = typeof payload === "string" ? payload : JSON.stringify(payload);
    this.onmessage?.({ data });
  }

  get subscriptions() {
    const set = new Set<number>();
    for (const m of this.sent) {
      if (m.type === "subscribe" && m.matchId != null) set.add(m.matchId);
      if (m.type === "unsubscribe" && m.matchId != null) set.delete(m.matchId);
    }
    return set;
  }
}
