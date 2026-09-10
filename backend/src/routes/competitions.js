import express from "express";
import { footballGet } from "../services/footballClient.js";

const router = express.Router();

// ── Static list — no API call needed ────────────────────────────────────────
const TRACKED_COMPETITIONS = [
  { code: "PL",  name: "Premier League",       country: "England", emblem: "https://crests.football-data.org/PL.png"  },
  { code: "CL",  name: "UEFA Champions League",country: "Europe",  emblem: "https://crests.football-data.org/CL.png"  },
  { code: "PD",  name: "La Liga",              country: "Spain",   emblem: "https://crests.football-data.org/PD.png"  },
  { code: "BL1", name: "Bundesliga",           country: "Germany", emblem: "https://crests.football-data.org/BL1.png" },
  { code: "SA",  name: "Serie A",              country: "Italy",   emblem: "https://crests.football-data.org/SA.png"  },
  { code: "WC",  name: "FIFA World Cup",       country: "World",   emblem: "https://crests.football-data.org/WC.png"  },
];

const VALID_CODES = new Set(TRACKED_COMPETITIONS.map(c => c.code));

// ── In-memory cache ──────────────────────────────────────────────────────────
const cache = new Map();
const TTL = {
  STANDINGS: 15 * 60 * 1000,
  TEAMS:     24 * 60 * 60 * 1000,
  SCORERS:    6 * 60 * 60 * 1000,
};

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { cache.delete(key); return null; }
  return entry.data;
}

function setCached(key, data, ttlMs) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ── Middleware ───────────────────────────────────────────────────────────────
function validateCode(req, res, next) {
  const code = req.params.code.toUpperCase();
  if (!VALID_CODES.has(code)) {
    return res.status(400).json({ error: "Invalid or unsupported competition code." });
  }
  req.params.code = code;
  next();
}

// ── Helper ───────────────────────────────────────────────────────────────────
async function fetchWithCache(endpoint, cacheKey, ttlMs, res) {
  const cached = getCached(cacheKey);
  if (cached) return res.status(200).json({ data: cached });

  try {
    const { data } = await footballGet(endpoint);
    setCached(cacheKey, data, ttlMs);
    return res.status(200).json({ data });
  } catch (err) {
    const status = err.response?.status ?? 500;
    const message = err.response?.data?.message ?? "Failed to fetch data.";
    console.error(`[competitions] ${endpoint}:`, message);
    return res.status(status).json({ error: message });
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /competitions — static, no API call
router.get("/", (req, res) => {
  return res.status(200).json({ data: TRACKED_COMPETITIONS });
});

// GET /competitions/:code/standings
router.get("/:code/standings", validateCode, async (req, res) => {
  const { code } = req.params;
  return fetchWithCache(`/competitions/${code}/standings`, `${code}:standings`, TTL.STANDINGS, res);
});

// GET /competitions/:code/teams
router.get("/:code/teams", validateCode, async (req, res) => {
  const { code } = req.params;
  return fetchWithCache(`/competitions/${code}/teams`, `${code}:teams`, TTL.TEAMS, res);
});

// GET /competitions/:code/scorers
router.get("/:code/scorers", validateCode, async (req, res) => {
  const { code } = req.params;
  return fetchWithCache(`/competitions/${code}/scorers`, `${code}:scorers`, TTL.SCORERS, res);
});

export default router;