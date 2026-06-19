import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
  updateScoreSchema,
  matchIdParamSchema,
} from "../validation/matches.js";
import { matches } from "../db/schema.js";
import { db } from "../db/db.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc, eq } from "drizzle-orm";

export const matchRouter = Router();

const MAX_LIMIT = 100;

// GET /matches
matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid Query Parameters",
      details: parsed.error.issues,
    });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    let query = db
      .select()
      .from(matches)
      .orderBy(desc(matches.startTime))
      .limit(limit);

    if (parsed.data.sport) {
      query = query.where(eq(matches.sport, parsed.data.sport));
    }

    const data = await query;
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: "Failed to List Matches" });
  }
});

// GET /matches/:id
matchRouter.get("/:id", async (req, res) => {
  const parsed = matchIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid match ID",
      details: parsed.error.issues,
    });
  }

  try {
    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, parsed.data.id))
      .limit(1);

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.json({ data: match });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch match" });
  }
});

// POST /matches
matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid Payload",
      details: parsed.error.issues,
    });
  }

  const { startTime, endTime, homeScore, awayScore } = parsed.data;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();

    if (res.app.locals.broadcastMatchCreated) {
      res.app.locals.broadcastMatchCreated(event);
    }

    res.status(201).json({ data: event });
  } catch (e) {
    res.status(500).json({
      error: "Failed to create match.",
      details: JSON.stringify(e),
    });
  }
});

// PUT /matches/:id/score
matchRouter.put("/:id/score", async (req, res) => {
  const paramParsed = matchIdParamSchema.safeParse(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({
      error: "Invalid match ID",
      details: paramParsed.error.issues,
    });
  }

  const bodyParsed = updateScoreSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({
      error: "Invalid score data",
      details: bodyParsed.error.issues,
    });
  }

  const { id } = paramParsed.data;
  const { homeScore, awayScore } = bodyParsed.data;

  try {
    const [updated] = await db
      .update(matches)
      .set({ homeScore, awayScore })
      .where(eq(matches.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Match not found" });
    }

    if (res.app.locals.broadcastScoreUpdate) {
      res.app.locals.broadcastScoreUpdate({ matchId: id, homeScore, awayScore });
    }

    res.json({ data: updated });
  } catch (e) {
    res.status(500).json({
      error: "Failed to update score",
      details: JSON.stringify(e),
    });
  }
});