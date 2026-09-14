import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Match } from "@/types";
import type { ScorecardResponse } from "@/api/scorecards";
import ScorecardTab from "../ScorecardTab";

const getCricketScorecard = vi.hoisted(() => vi.fn());

vi.mock("@/api/scorecards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/scorecards")>();
  return { ...actual, getCricketScorecard };
});

const cricketMatch: Match = {
  id: "650",
  sport: "cricket",
  homeTeam: "India",
  awayTeam: "Australia",
  status: "finished",
  startTime: "2026-09-14T09:00:00.000Z",
  metadata: {
    innings: [{ label: "India 1st", runs: 0, wickets: 0, overs: 12.3 }],
  },
};

const footballMatch: Match = {
  id: "12",
  sport: "football",
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  status: "finished",
  startTime: "2026-09-14T09:00:00.000Z",
};

function available(overrides: Record<string, unknown> = {}): ScorecardResponse {
  return {
    data: {
      complete: true,
      result: "India won by 5 wickets",
      innings: [
        {
          id: 1,
          teamName: "India",
          teamShortName: "IND",
          runs: 0,
          wickets: 0,
          overs: "19.6",
          declared: true,
          followOn: null,
          batting: [
            {
              playerId: 1,
              name: "R Sharma",
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              strikeRate: 0,
              dismissal: null,
            },
          ],
          bowling: [],
          extras: {
            byes: 0,
            legByes: null,
            wides: 2,
            noBalls: 0,
            penalty: null,
            total: 2,
          },
          fallOfWickets: [{ playerId: 1, name: "R Sharma", teamRuns: 0, delivery: "19.6" }],
          partnerships: null,
          ...overrides,
        },
      ],
    },
    meta: {
      availability: "available",
      source: "saved",
      provider: "cricbuzz",
      schemaVersion: 1,
      savedAt: "2026-09-14T09:05:00.000Z",
    },
  } as ScorecardResponse;
}

function renderTab(match: Match) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ScorecardTab match={match} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getCricketScorecard.mockReset();
});

describe("ScorecardTab", () => {
  it("renders saved scorecard data with provider labels preserved", async () => {
    getCricketScorecard.mockResolvedValue(available());
    renderTab(cricketMatch);

    expect(await screen.findByText("Saved scorecard")).toBeInTheDocument();
    expect(screen.getByText("India won by 5 wickets")).toBeInTheDocument();
    expect(screen.getByText("0/0")).toBeInTheDocument();
    expect(screen.getByText("19.6 overs")).toBeInTheDocument();
    expect(screen.getByText("Declared")).toBeInTheDocument();
    expect(screen.queryByText("Follow on")).not.toBeInTheDocument();
    expect(screen.getAllByText("19.6").length).toBeGreaterThan(0);
    expect(getCricketScorecard).toHaveBeenCalledWith("650");
  });

  it("shows zeros as zero and missing dismissal as an em dash", async () => {
    getCricketScorecard.mockResolvedValue(available());
    renderTab(cricketMatch);

    await screen.findByText("Saved scorecard");
    const row = screen.getAllByText("R Sharma")[0].closest("tr")!;
    const cells = Array.from(row.querySelectorAll("td")).map((c) => c.textContent);
    expect(cells[1]).toBe("—");
    expect(cells.slice(2)).toEqual(["0", "0", "0", "0", "0"]);
    expect(screen.queryByText("not out")).not.toBeInTheDocument();
  });

  it("distinguishes missing sections from empty ones", async () => {
    getCricketScorecard.mockResolvedValue(available());
    renderTab(cricketMatch);

    expect(await screen.findByText("No bowling")).toBeInTheDocument();
    expect(screen.getByText("Partnerships unavailable")).toBeInTheDocument();
  });

  it("keeps nulls in extras as em dashes while showing zero totals", async () => {
    getCricketScorecard.mockResolvedValue(available());
    renderTab(cricketMatch);

    await screen.findByText("Saved scorecard");
    expect(screen.getByText(/b 0, lb —, w 2, nb 0, p —/)).toBeInTheDocument();
  });

  it("falls back to the innings summary when nothing is saved", async () => {
    getCricketScorecard.mockResolvedValue({
      data: null,
      meta: { availability: "not_saved" },
    });
    renderTab(cricketMatch);

    expect(await screen.findByText(/No detailed scorecard saved yet/)).toBeInTheDocument();
    expect(screen.getByText("India 1st")).toBeInTheDocument();
  });

  it("shows an error state and retries on demand", async () => {
    getCricketScorecard.mockRejectedValue(new Error("boom"));
    renderTab(cricketMatch);

    expect(await screen.findByText("Could not load the scorecard.")).toBeInTheDocument();

    getCricketScorecard.mockResolvedValue(available());
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Saved scorecard")).toBeInTheDocument();
  });

  it("makes no request for football", async () => {
    renderTab(footballMatch);

    expect(screen.getByText("Not available for football")).toBeInTheDocument();
    await waitFor(() => expect(getCricketScorecard).not.toHaveBeenCalled());
  });
});
