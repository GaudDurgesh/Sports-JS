import axios from "axios";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_CRICKET_HOST = "cricbuzz-cricket.p.rapidapi.com";

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;

const TRACKED_COMPETITIONS = ["WC", "PL", "CL", "PD", "BL1", "SA"];

// ─── Helpers ──────────────────────────────────────────────────────

function logFootballFetchError(label, err) {
  if (err.response?.status === 429) {
    const reset = err.response.headers?.["x-requestcounter-reset"];
    console.warn(
      `[${label}] rate limited (429)${reset ? ` — resets in ${reset}s` : ""}`,
    );
  } else if (
    err.code === "ECONNRESET" ||
    err.message?.includes("socket hang up")
  ) {
    console.warn(`[${label}] connection issue — skipping this cycle`);
  } else {
    console.error(`[${label}] failed:`, err.message);
  }
}

// ─── Cricbuzz normalizer ──────────────────────────────────────────
// Cricbuzz response structure:
//   data.typeMatches[].seriesMatches[].seriesAdWrapper.matches[]
// Each match has matchInfo + matchScore (may be absent for upcoming).
//
// matchInfo.team1 = home team (always explicit, no guessing needed)
// matchInfo.team2 = away team
// matchScore.team1Score.inngs1 = { runs, wickets, overs }
// matchScore.team1Score.inngs2 = second innings (Test only)
// matchInfo.state: "In Progress" | "Complete" | "Preview" | "Stumps" | "Lunch" etc.

function normalizeCricketMatch(matchInfo, matchScore) {
  const homeTeam = matchInfo.team1?.teamName ?? "TBD";
  const awayTeam = matchInfo.team2?.teamName ?? "TBD";

  // state drives status — anything that isn't Complete or Preview is live
  const state = matchInfo.state ?? "";
  let status = "scheduled";
  if (state === "Complete") status = "finished";
  else if (state !== "Preview" && state !== "") status = "live";

  // Build innings array stored in metadata.
  // Cricbuzz separates scores by team (team1Score/team2Score) and by
  // innings number (inngs1/inngs2). We flatten into the same shape
  // the frontend already expects: [{ label, runs, wickets, overs }]
  // Label format: "<teamName> Inning <n>" — same pattern as CricAPI
  // so CricketScorecard and sumCricketRuns work unchanged.
  const innings = [];
  const t1 = matchScore?.team1Score ?? {};
  const t2 = matchScore?.team2Score ?? {};

  // inngs1 = first innings of that team, inngs2 = second (Test)
  // Order: team1 inn1, team2 inn1, team1 inn2, team2 inn2
  // (chronological batting order for a standard Test)
  for (const [teamName, teamScore] of [
    [homeTeam, t1],
    [awayTeam, t2],
  ]) {
    for (const key of ["inngs1", "inngs2"]) {
      const inn = teamScore[key];
      if (inn && inn.runs != null) {
        const innNum = key === "inngs1" ? 1 : 2;
        innings.push({
          label: `${teamName} Inning ${innNum}`,
          runs: inn.runs ?? 0,
          wickets: inn.wickets ?? null,
          overs: inn.overs ?? null,
        });
      }
    }
  }

  // homeScore / awayScore = sum of all innings runs for each team
  // (used on match cards and as a quick snapshot)
  const homeScore = innings
    .filter((i) => i.label.startsWith(homeTeam))
    .reduce((s, i) => s + i.runs, 0);
  const awayScore = innings
    .filter((i) => i.label.startsWith(awayTeam))
    .reduce((s, i) => s + i.runs, 0);

  // startDate from Cricbuzz is epoch ms as a string
  const startTime = matchInfo.startDate
    ? new Date(Number(matchInfo.startDate))
    : new Date();

  return {
    externalId: `cb-${matchInfo.matchId}`,
    sport: "cricket",
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    status,
    startTime,
    endTime: status === "finished" ? startTime : null,
    metadata: {
      matchType: matchInfo.matchFormat?.toLowerCase() ?? null,
      venue: matchInfo.venueName ?? null,
      series: matchInfo.seriesName ?? null,
      innings,
    },
  };
}

// ─── Cricbuzz fetcher ─────────────────────────────────────────────
// Single call to /matches/v1/live fetches ALL live+recent matches.
// We also call /matches/v1/recent in the same request batch to catch
// matches that finished between syncs. Both count toward the 200/month limit.
// Total: 2 calls per sync cycle. At 4-hour intervals = 2×(30×24/4) = 360/month
// — too many. So we use ONLY /matches/v1/live which also includes recently
// completed matches in the "Complete" state. 1 call per cycle.
// At 4-hour intervals: 1×(30×24/4) = 180 calls/month — within limit.

export async function fetchLiveCricketMatches() {
  try {
    const { data } = await axios.get(
      `https://${RAPIDAPI_CRICKET_HOST}/matches/v1/live`,
      {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_CRICKET_HOST,
        },
        timeout: 10_000,
      },
    );

    const results = [];

    // Flatten the nested structure: typeMatches > seriesMatches > matches
    for (const typeMatch of data.typeMatches ?? []) {
      for (const seriesMatch of typeMatch.seriesMatches ?? []) {
        // seriesMatch can be { seriesAdWrapper: { matches: [] } }
        // or { seriesAdWrapper: undefined } for advert entries — guard both
        const matches = seriesMatch.seriesAdWrapper?.matches ?? [];
        for (const m of matches) {
          if (!m.matchInfo?.matchId) continue;
          if (!m.matchInfo?.team1 || !m.matchInfo?.team2) continue;
          results.push(normalizeCricketMatch(m.matchInfo, m.matchScore));
        }
      }
    }

    console.log(`[cricbuzz] fetched ${results.length} matches`);
    return results;
  } catch (err) {
    console.error("[cricbuzz] fetchLiveCricketMatches failed:", err.message);
    return [];
  }
}

// ─── Football normalizer ──────────────────────────────────────────

function normalizeFootballDataMatch(match) {
  const statusMap = {
    IN_PLAY: "live",
    PAUSED: "live",
    FINISHED: "finished",
    TIMED: "scheduled",
    SCHEDULED: "scheduled",
    POSTPONED: "finished",
    CANCELLED: "finished",
  };

  const homeScore =
    match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? 0;
  const awayScore =
    match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? 0;

  return {
    externalId: `fd-${match.id}`,
    sport: "football",
    homeTeam: match.homeTeam?.shortName ?? match.homeTeam?.name ?? "TBD",
    awayTeam: match.awayTeam?.shortName ?? match.awayTeam?.name ?? "TBD",
    homeScore,
    awayScore,
    status: statusMap[match.status] ?? "scheduled",
    startTime: new Date(match.utcDate),
    endTime: match.status === "FINISHED" ? new Date(match.utcDate) : null,
  };
}

// ─── Football fetchers ────────────────────────────────────────────

export async function fetchLiveFootballMatches() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .split("T")[0];

    const { data } = await axios.get(`${FOOTBALL_DATA_BASE}/matches`, {
      headers: { "X-Auth-Token": FOOTBALL_DATA_KEY },
      params: {
        status: "IN_PLAY,PAUSED,FINISHED",
        dateFrom: yesterday,
        dateTo: today,
      },
      timeout: 10_000,
    });
    return (data.matches ?? []).map(normalizeFootballDataMatch);
  } catch (err) {
    logFootballFetchError("football-live", err);
    return [];
  }
}

export async function fetchScheduledFootballMatches() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86_400_000)
      .toISOString()
      .split("T")[0];

    const requests = TRACKED_COMPETITIONS.map((code) =>
      axios
        .get(`${FOOTBALL_DATA_BASE}/competitions/${code}/matches`, {
          headers: { "X-Auth-Token": FOOTBALL_DATA_KEY },
          params: { status: "SCHEDULED,TIMED", dateFrom: today, dateTo: tomorrow },
          timeout: 10_000,
        })
        .then((r) => r.data.matches ?? [])
        .catch((err) => {
          logFootballFetchError(`football-schedule:${code}`, err);
          return [];
        }),
    );

    const results = await Promise.all(requests);
    return results.flat().map(normalizeFootballDataMatch);
  } catch (err) {
    logFootballFetchError("football-schedule", err);
    return [];
  }
}