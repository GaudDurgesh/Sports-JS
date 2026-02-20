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
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  // 🔐 Protect BEFORE handshake
  server.on("upgrade", async (req, socket, head) => {
    if (req.url !== "/ws") {
      socket.destroy();
      return;
    }

    try {
      if (wsArcjet) {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          const isRateLimit = decision.reason.isRateLimit();

          const statusCode = isRateLimit ? 429 : 403;
          const statusMessage = isRateLimit
            ? "Rate Limit exceeded"
            : "Access denied";

          socket.write(
            `HTTP/1.1 ${statusCode} ${statusMessage}\r\n` +
              "Connection: close\r\n" +
              "Content-Type: text/plain\r\n" +
              `Content-Length: ${statusMessage.length}\r\n` +
              "\r\n" +
              statusMessage
          );

          socket.destroy();
          return;
        }
      }

      // ✅ If allowed → upgrade
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });

    } catch (error) {
      console.error("Upgrade security error:", error);
      socket.destroy(); // must destroy raw socket
    }
  });

  // ✅ No Arcjet logic here anymore
  wss.on("connection", (socket) => {
    socket.isAlive = true;

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    sendJson(socket, { type: "welcome" });

    socket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "match_created", data: match });
  }

  return { broadcastMatchCreated };
}