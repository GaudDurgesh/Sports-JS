export function normalizeFootballEvents(data, matchId) {
  const events = [];
  const unavailable = [];
  const occurrences = new Map();

  const groups = ["goals", "bookings", "substitutions"];

  const minuteValue = (value) =>
    Number.isInteger(value) && value >= 0 ? value : null;

  function teamSide(team) {
    if (team?.id != null) {
      if (team.id === data.homeTeam?.id) return "home";
      if (team.id === data.awayTeam?.id) return "away";
    }

    return team?.name ?? team?.shortName ?? "Unknown team";
  }

  for (const group of groups) {
    const rows = data[group];

    if (rows == null) {
      unavailable.push(group);
      continue;
    }

    if (!Array.isArray(rows)) {
      throw new Error(`Invalid provider event collection: ${group}`);
    }

    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error(`Invalid provider event in ${group}`);
      }

      const minute = minuteValue(row.minute);
      const addedTime = minuteValue(row.injuryTime);
      const team = teamSide(row.team);

      let type;
      let actor;
      let message;

      if (group === "goals") {
        type = "goal";
        actor = row.scorer?.name ?? "Unknown scorer";
        message =
          row.type === "OWN_GOAL"
            ? "Own goal"
            : row.type === "PENALTY"
              ? "Penalty goal"
              : "Goal";
      } else if (group === "bookings") {
        type =
          row.card === "YELLOW"
            ? "yellow_card"
            : row.card === "RED" || row.card === "YELLOW_RED"
              ? "red_card"
              : "booking";

        actor = row.player?.name ?? "Unknown player";
        message =
          row.card === "YELLOW_RED"
            ? "Second yellow card"
            : row.card === "YELLOW"
              ? "Yellow card"
              : row.card === "RED"
                ? "Red card"
                : "Booking";
      } else {
        type = "substitution";
        actor = row.playerIn?.name ?? "Unknown player";
        message = `On: ${actor}; off: ${
          row.playerOut?.name ?? "Unknown player"
        }`;
      }

      // Prefer a provider event ID. Otherwise use event identity fields.
      const identity = JSON.stringify([
        String(matchId),
        group,
        row.id ?? [
          minute,
          addedTime,
          row.team?.id ?? team,
          row.scorer?.id ?? row.scorer?.name ?? null,
          row.player?.id ?? row.player?.name ?? null,
          row.playerIn?.id ?? row.playerIn?.name ?? null,
          row.playerOut?.id ?? row.playerOut?.name ?? null,
          row.type ?? null,
          row.card ?? null,
        ],
      ]);

      const occurrence = occurrences.get(identity) ?? 0;
      occurrences.set(identity, occurrence + 1);

      events.push({
        id: `${identity}:${occurrence}`,
        minute,
        type,
        actor,
        team,
        message,
        metadata: {
          addedTime,
          providerType: row.type ?? null,
          card: row.card ?? null,
          assist: row.assist?.name ?? null,
        },
      });
    }
  }

  events.sort(
    (a, b) =>
      (a.minute ?? Infinity) - (b.minute ?? Infinity) ||
      (a.metadata.addedTime ?? 0) - (b.metadata.addedTime ?? 0),
  );

  return {
    events,
    coverage:
      unavailable.length === groups.length
        ? "unavailable"
        : unavailable.length > 0
          ? "partial"
          : "complete",
    unavailable,
  };
}