import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { matches, cricketScorecards } from "../db/schema.js";

export const scorecardsRouter = Router();

scorecardsRouter.get("/:id/scorecard", async (req, res) => {
  const rawId = req.params.id;

  if (typeof rawId !== "string" || !/^[1-9]\d*$/.test(rawId)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  const matchId = Number(rawId);

  if (!Number.isSafeInteger(matchId) || matchId > 2147483647) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  try {
    const [match] = await db
      .select({ id: matches.id, sport: matches.sport })
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    if (match.sport !== "cricket") {
      return res.json({
        data: null,
        meta: { availability: "unsupported" },
      });
    }

    const [saved] = await db
      .select({
        data: cricketScorecards.data,
        provider: cricketScorecards.provider,
        schemaVersion: cricketScorecards.schemaVersion,
        savedAt: cricketScorecards.savedAt,
      })
      .from(cricketScorecards)
      .where(eq(cricketScorecards.matchId, matchId))
      .limit(1);

    if (!saved) {
      return res.json({
        data: null,
        meta: { availability: "not_saved" },
      });
    }

    return res.json({
      data: saved.data,
      meta: {
        availability: "available",
        source: "saved",
        provider: saved.provider,
        schemaVersion: saved.schemaVersion,
        savedAt: saved.savedAt,
      },
    });
  } catch (error) {
    console.error("[scorecard] read failed:", error.message);
    return res.status(500).json({
      error: "Failed to fetch scorecard",
    });
  }
});