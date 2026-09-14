function nonNegativeNumber(value, label, integer = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    (integer && !Number.isSafeInteger(value))
  ) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function optionalNumber(value, label) {
  if (value === null || value === undefined || value === "") return null;

  const number =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  return nonNegativeNumber(number, label);
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${label}`);
  }
  return value.trim();
}

function optionalText(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function optionalRows(value, label, mapper) {
  // Missing data stays null; an explicitly empty array stays [].
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) throw new Error(`Invalid ${label}`);

  return value.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`Invalid ${label} entry`);
    }
    return mapper(row);
  });
}

function normalizeExtras(value) {
  if (value === undefined || value === null) return null;

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid extras");
  }

  const fields = {
    byes: "byes",
    legByes: "legbyes",
    wides: "wides",
    noBalls: "noballs",
    penalty: "penalty",
    total: "total",
  };

  return Object.fromEntries(
    Object.entries(fields).map(([name, providerKey]) => {
      const amount = value[providerKey];

      return [
        name,
        amount === undefined || amount === null
          ? null
          : nonNegativeNumber(amount, `extras ${name}`, true),
      ];
    }),
  );
}

function nestedRows(value, key, label, mapper) {
  if (value === undefined || value === null) return null;

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label}`);
  }

  return optionalRows(value[key], label, mapper);
}

function optionalCount(value, label) {
  return value === undefined || value === null
    ? null
    : nonNegativeNumber(value, label, true);
}

function deliveryLabel(value) {
  if (value === undefined || value === null) return null;

  if (
    (typeof value !== "string" && typeof value !== "number") ||
    !/^\d+(?:\.[0-6])?$/.test(String(value))
  ) {
    throw new Error("Invalid wicket delivery");
  }

  // Preserve provider notation, including "19.6"; no decimal arithmetic.
  return String(value);
}

function normalizeFallOfWickets(value) {
  return nestedRows(value, "fow", "fall of wickets", (row) => ({
    playerId: nonNegativeNumber(row.batsmanid, "dismissed player ID", true),
    name: requiredText(row.batsmanname, "dismissed player name"),
    teamRuns: nonNegativeNumber(row.runs, "team runs at wicket", true),
    delivery: deliveryLabel(row.overnbr),
  }));
}

function normalizePartnerships(value) {
  return nestedRows(value, "partnership", "partnerships", (row) => ({
    runs: nonNegativeNumber(row.totalruns, "partnership runs", true),
    balls: optionalCount(row.totalballs, "partnership balls"),
    batters: [
      {
        playerId: nonNegativeNumber(row.bat1id, "partner 1 ID", true),
        name: requiredText(row.bat1name, "partner 1 name"),
        runs: optionalCount(row.bat1runs, "partner 1 runs"),
        balls: optionalCount(row.bat1balls, "partner 1 balls"),
      },
      {
        playerId: nonNegativeNumber(row.bat2id, "partner 2 ID", true),
        name: requiredText(row.bat2name, "partner 2 name"),
        runs: optionalCount(row.bat2runs, "partner 2 runs"),
        balls: optionalCount(row.bat2balls, "partner 2 balls"),
      },
    ],
  }));
}

export function normalizeCricketScorecard(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid cricket scorecard response");
  }

  if (!Array.isArray(raw.scorecard) || raw.scorecard.length === 0) {
    throw new Error("Cricket scorecard is missing innings");
  }

  if (typeof raw.ismatchcomplete !== "boolean") {
    throw new Error("Cricket completion state is missing");
  }

  const seenInnings = new Set();

  const innings = raw.scorecard.map((innings) => {
    if (!innings || typeof innings !== "object") {
      throw new Error("Invalid innings");
    }

    const id = nonNegativeNumber(innings.inningsid, "innings ID", true);
    if (id === 0 || seenInnings.has(id)) {
      throw new Error("Invalid or duplicate innings ID");
    }
    seenInnings.add(id);

    return {
      id,
      teamName: requiredText(innings.batteamname, "batting team"),
      teamShortName: optionalText(innings.batteamsname),
      runs: nonNegativeNumber(innings.score, "innings runs", true),
      wickets: nonNegativeNumber(innings.wickets, "innings wickets", true),
      extras: normalizeExtras(innings.extras),
      fallOfWickets: normalizeFallOfWickets(innings.fow),
      partnerships: normalizePartnerships(innings.partnership),

      // Preserve cricket notation; do not treat overs as decimal arithmetic.
      overs:
        innings.overs === null || innings.overs === undefined
          ? null
          : String(innings.overs),

      declared:
        typeof innings.isdeclared === "boolean" ? innings.isdeclared : null,
      followOn:
        typeof innings.isfollowon === "boolean" ? innings.isfollowon : null,

      batting: optionalRows(innings.batsman, "batting", (player) => ({
        playerId: nonNegativeNumber(player.id, "batter ID", true),
        name: requiredText(player.name, "batter name"),
        runs: nonNegativeNumber(player.runs, "batter runs", true),
        balls: nonNegativeNumber(player.balls, "balls faced", true),
        fours: nonNegativeNumber(player.fours, "fours", true),
        sixes: nonNegativeNumber(player.sixes, "sixes", true),
        strikeRate: optionalNumber(player.strkrate, "strike rate"),
        dismissal: optionalText(player.outdec),
      })),

      bowling: optionalRows(innings.bowler, "bowling", (player) => ({
        playerId: nonNegativeNumber(player.id, "bowler ID", true),
        name: requiredText(player.name, "bowler name"),
        overs:
          player.overs === null || player.overs === undefined
            ? null
            : String(player.overs),
        maidens: nonNegativeNumber(player.maidens, "maidens", true),
        runs: nonNegativeNumber(player.runs, "runs conceded", true),
        wickets: nonNegativeNumber(player.wickets, "bowler wickets", true),
        economy: optionalNumber(player.economy, "economy"),
      })),
    };
  });

  innings.sort((a, b) => a.id - b.id);

  return {
    complete: raw.ismatchcomplete,
    result: optionalText(raw.status),
    innings,
  };
}
