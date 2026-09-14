import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db/db.js";
import { matches, cricketScorecards } from "../src/db/schema.js";
import { normalizeCricketScorecard } from "../src/services/normalizeCricketScorecard.js";

async function main() {
  const externalId = "cb-169360";
  const fixtureUrl = new URL(
    "./fixtures/cricket-scorecard-169360.json",
    import.meta.url,
  );

  const raw = JSON.parse(await readFile(fixtureUrl, "utf8"));

  // Verify the response belongs to the intended provider match.
  const sourceUrl = new URL(raw.appindex?.weburl);
  if (!/^\/live-cricket-scorecard\/169360(?:\/|$)/.test(sourceUrl.pathname)) {
    throw new Error("Fixture does not identify provider match 169360");
  }

  const data = normalizeCricketScorecard(raw);

  if (!data.complete) {
    throw new Error("This import requires a completed scorecard");
  }

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.externalId, externalId))
    .limit(1);

  if (!match || match.sport !== "cricket") {
    throw new Error("Matching cricket fixture was not found in the database");
  }

  const [saved] = await db
    .insert(cricketScorecards)
    .values({
      matchId: match.id,
      provider: "cricbuzz",
      sourceExternalId: externalId,
      schemaVersion: 1,
      rawData: raw,
      data,
    })
    .onConflictDoNothing({ target: cricketScorecards.matchId })
    .returning({ matchId: cricketScorecards.matchId });

  if (!saved) {
    console.log("Scorecard already exists; existing data preserved.");
    return;
  }

  console.log("Saved scorecard for match:", saved.matchId);
  console.log("Teams:", match.homeTeam, "vs", match.awayTeam);
  console.log("Innings:", data.innings.length);
  console.log("Result:", data.result);
  console.log("No provider API requests. Match scores/status unchanged.");
}

try {
  await main();
} catch (error) {
  console.error("Import failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}