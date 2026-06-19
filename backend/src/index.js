import AgentAPI from 'apminsight';
AgentAPI.config()

import express from 'express';
import cors from 'cors';
import http from 'http';
import { matchRouter } from './routes/matches.js';
import { attachWebSocketServer } from './ws/server.js';
import { securityMiddleware } from './arcjet.js';
import { commentaryRouter } from './routes/commentary.js';
import { startSyncJob } from './services/syncJob.js';
import { eventsRouter } from './routes/events.js'

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);

app.use(express.json());

// ✅ FIX: CORS origin from env var so Vercel frontend is allowed in production.
// Locally VITE runs on localhost:5173; in production set CORS_ORIGIN=https://your-app.vercel.app
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173']

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/', (req, res) => res.send('ScoreBoard JS API'));

// app.use(securityMiddleware());

app.use('/matches', matchRouter);
app.use('/matches/:id/commentary', commentaryRouter);
app.use('/matches/:id/events', eventsRouter)

// 1. Attach WebSocket FIRST — this creates the broadcast functions
const { broadcastMatchCreated, broadcastCommentary, broadcastScoreUpdate } = attachWebSocketServer(server);

// 2. Store on app.locals for route handlers that need them
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;
app.locals.broadcastScoreUpdate = broadcastScoreUpdate;

// 3. NOW start the sync job — broadcast functions exist at this point
startSyncJob({ broadcastScoreUpdate, broadcastMatchCreated });

server.listen(PORT, HOST, () => {
  const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server is running on ${baseUrl}`);
  console.log(`WebSocket server is running on ${baseUrl.replace('http', 'ws')}/ws`);
});