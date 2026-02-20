import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js"

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(payload));
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ 
    noServer: true, 
    path: '/ws', 
    maxPayload: 1024 * 1024 
  });

  // 🔹 REQUIRED when using noServer: true
  server.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (socket, req) => {

    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? 'Rate Limit exceeded'
            : 'Access denied';

          socket.close(code, reason);
          return;
        }

      } catch (e) {
        console.error('WS connection error', e);
        socket.close(1011, 'Server Security error');
        return;
      }
    }

    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });

    sendJson(socket, { type: 'welcome' });

    socket.on('error', console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  function broadcastMatchCreated(match) {
    broadcast(wss, { type: 'match_created', data: match });
  }

  return { broadcastMatchCreated };
}