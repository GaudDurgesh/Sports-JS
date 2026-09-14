import axios from "axios";
import { footballGet } from "./footballClient.js";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_CRICKET_HOST = "cricbuzz-cricket.p.rapidapi.com";

const TRACKED_COMPETITIONS = ["WC", "PL", "CL", "PD", "BL1", "SA"];

// Static flag map — Wikimedia SVG flags, freely available
// Key = exact teamName from Cricbuzz, Value = flag URL
const CRICKET_FLAGS = {
  // Full nation names
  India: "https://upload.wikimedia.org/wikipedia/en/4/41/Flag_of_India.svg",
  Australia:
    "https://upload.wikimedia.org/wikipedia/en/b/b9/Flag_of_Australia.svg",
  England: "https://upload.wikimedia.org/wikipedia/en/b/be/Flag_of_England.svg",
  Pakistan:
    "https://upload.wikimedia.org/wikipedia/commons/3/32/Flag_of_Pakistan.svg",
  "South Africa":
    "https://upload.wikimedia.org/wikipedia/commons/a/af/Flag_of_South_Africa.svg",
  "New Zealand":
    "https://upload.wikimedia.org/wikipedia/commons/3/3e/Flag_of_New_Zealand.svg",
  "West Indies":
    "https://upload.wikimedia.org/wikipedia/commons/1/18/WI-flag.svg",
  "Sri Lanka":
    "https://upload.wikimedia.org/wikipedia/commons/1/11/Flag_of_Sri_Lanka.svg",
  Bangladesh:
    "https://upload.wikimedia.org/wikipedia/commons/f/f9/Flag_of_Bangladesh.svg",
  Zimbabwe:
    "https://upload.wikimedia.org/wikipedia/commons/6/6a/Flag_of_Zimbabwe.svg",
  Afghanistan:
    "https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_the_Taliban.svg",
  Ireland:
    "https://upload.wikimedia.org/wikipedia/commons/4/45/Flag_of_Ireland.svg",
  Scotland:
    "https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_Scotland.svg",
  Netherlands:
    "https://upload.wikimedia.org/wikipedia/commons/2/20/Flag_of_the_Netherlands.svg",
  Nepal:
    "https://upload.wikimedia.org/wikipedia/commons/9/9b/Flag_of_Nepal.svg",
  Oman: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Oman.svg",
  Uganda:
    "https://upload.wikimedia.org/wikipedia/commons/4/4e/Flag_of_Uganda.svg",
  Namibia:
    "https://upload.wikimedia.org/wikipedia/commons/0/00/Flag_of_Namibia.svg",
  Kenya:
    "https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Kenya.svg",
  Canada:
    "https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Canada_%28Pantone%29.svg",
  USA: "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg",
  "United States of America":
    "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg",
  UAE: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_United_Arab_Emirates.svg",
  "Papua New Guinea":
    "https://upload.wikimedia.org/wikipedia/commons/e/e3/Flag_of_Papua_New_Guinea.svg",
  // Franchise / league teams — use competition logo fallback (null is fine)
  "Mumbai Indians": null,
  "Chennai Super Kings": null,
  "Royal Challengers Bengaluru": null,
  "Kolkata Knight Riders": null,
  "Delhi Capitals": null,
  "Sunrisers Hyderabad": null,
  "Punjab Kings": null,
  "Rajasthan Royals": null,
  "Lucknow Super Giants": null,
  "Gujarat Titans": null,
  "San Francisco Unicorns": null,
  "Guyana Amazon Warriors": null,
  "Trinidad & Tobago Knight Riders": null,
  "Barbados Royals": null,
  "Jamaica Tallawahs": null,
  "Saint Lucia Kings": null,
  "Antigua and Barbuda Falcons": null,
  Warwickshire: null,
  Lancashire: null,
  Yorkshire: null,
  Hampshire: null,
  Surrey: null,
  Essex: null,
  Kent: null,
  Nottinghamshire: null,
  Derbyshire: null,
  Middlesex: null,
};

function getCricketFlag(teamName) {
  if (!teamName) return null;
  // Exact match first
  if (teamName in CRICKET_FLAGS) return CRICKET_FLAGS[teamName];
  // Partial match — handles "India Women", "Australia U19" etc.
  for (const [key, url] of Object.entries(CRICKET_FLAGS)) {
    if (key && teamName.startsWith(key)) return url;
  }
  return null;
}

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

function normalizeCricketMatch(matchInfo, matchScore) {
  const homeTeam = matchInfo.team1?.teamName ?? "TBD";
  const awayTeam = matchInfo.team2?.teamName ?? "TBD";

  const state = matchInfo.state ?? "";
  let status = "scheduled";
  if (state === "Complete") status = "finished";
  else if (state !== "Preview" && state !== "") status = "live";

  const innings = [];
  const t1 = matchScore?.team1Score ?? {};
  const t2 = matchScore?.team2Score ?? {};

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

  const homeScore = innings
    .filter((i) => i.label.startsWith(homeTeam))
    .reduce((s, i) => s + i.runs, 0);
  const awayScore = innings
    .filter((i) => i.label.startsWith(awayTeam))
    .reduce((s, i) => s + i.runs, 0);

  const startTime = matchInfo.startDate
    ? new Date(Number(matchInfo.startDate))
    : new Date();
  const homeInnings = innings.filter((i) => i.label.startsWith(homeTeam));
  const awayInnings = innings.filter((i) => i.label.startsWith(awayTeam));
  const homeWickets =
    homeInnings.length > 0
      ? (homeInnings[homeInnings.length - 1].wickets ?? null)
      : null;
  const awayWickets =
    awayInnings.length > 0
      ? (awayInnings[awayInnings.length - 1].wickets ?? null)
      : null;

  // Current overs (from the last innings)
  const lastInnings = innings[innings.length - 1];
  const currentOvers = lastInnings?.overs ?? null;

  return {
    externalId: `cb-${matchInfo.matchId}`,
    sport: "cricket",
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    homeWickets,
    awayWickets,
    status,
    startTime,
    endTime: status === "finished" ? startTime : null,
    metadata: {
      providerState: matchInfo.state ?? null,
      providerStatus: matchInfo.status ?? null,
      matchType: matchInfo.matchFormat?.toLowerCase() ?? null,
      venue: matchInfo.venueName ?? null,
      series: matchInfo.seriesName ?? null,
      toss: matchInfo.tossWinner
        ? `${matchInfo.tossWinner} chose to ${matchInfo.tossChoice?.toLowerCase() ?? "bat"}`
        : null,
      currentOvers,
      innings,
      homeTeamFlag: getCricketFlag(homeTeam),
      awayTeamFlag: getCricketFlag(awayTeam),
    },
  };
}

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

  const parsedUpdatedAt =
    typeof match.lastUpdated === "string" && match.lastUpdated.trim() !== ""
      ? new Date(match.lastUpdated)
      : null;

  const providerUpdatedAt =
    parsedUpdatedAt && Number.isFinite(parsedUpdatedAt.getTime())
      ? parsedUpdatedAt
      : null;

  return {
    externalId: `fd-${match.id}`,
    providerUpdatedAt,
    sport: "football",
    homeTeam: match.homeTeam?.shortName ?? match.homeTeam?.name ?? "TBD",
    awayTeam: match.awayTeam?.shortName ?? match.awayTeam?.name ?? "TBD",
    homeScore,
    awayScore,
    status: statusMap[match.status] ?? "scheduled",
    startTime: new Date(match.utcDate),
    endTime: match.status === "FINISHED" ? new Date(match.utcDate) : null,
    // ─── Competition metadata ─────────────────────────────────────
    // Stored in the matches.metadata JSONB column.
    // Required by: /standings, /leagues/:code/fixtures, StandingsWidget, LeaguePage.
    metadata: {
      competitionCode: match.competition?.code ?? null,
      competitionName: match.competition?.name ?? null,
      competitionEmblem: match.competition?.emblem ?? null,
      matchday: match.matchday ?? null,
      stage: match.stage ?? null,
      homeTeamCrest: match.homeTeam?.crest ?? null,
      awayTeamCrest: match.awayTeam?.crest ?? null,
      minute: match.score?.duration === "REGULAR" ? null : null, // filled by live sync
    },
  };
}

// ─── Football fetchers ────────────────────────────────────────────

export async function fetchLiveFootballMatches() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .split("T")[0];

    const requests = TRACKED_COMPETITIONS.map((code) =>
      footballGet(`/competitions/${code}/matches`, {
        status: "IN_PLAY,PAUSED,FINISHED",
        dateFrom: yesterday,
        dateTo: today,
      })
        .then((r) => r.data.matches ?? [])
        .catch((err) => {
          logFootballFetchError(`football-live:${code}`, err);
          return [];
        }),
    );

    const results = await Promise.all(requests);
    const flat = results.flat().map(normalizeFootballDataMatch);
    console.log(`[football-live] fetched ${flat.length} matches`);
    return flat;
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
      footballGet(`/competitions/${code}/matches`, {
        status: "SCHEDULED,TIMED",
        dateFrom: today,
        dateTo: tomorrow,
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
