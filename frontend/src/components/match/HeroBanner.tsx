import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Match } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamLogo from "@/components/ui/TeamLogo";
import { formatCricketScore, formatMatchStatus } from "@/utils/cricketUtils";

export default function HeroBanner({ matches }: { matches: Match[] }) {
  const slides = matches.slice(0, 3);
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const m = slides[idx];
  const isLive = m.status === "live";
  const isCricket = m.sport === "cricket";

  const homeFlag = isCricket ? m.metadata?.homeTeamFlag : null;
  const awayFlag = isCricket ? m.metadata?.awayTeamFlag : null;
  const homeCrest = !isCricket ? m.metadata?.homeTeamCrest : null;
  const awayCrest = !isCricket ? m.metadata?.awayTeamCrest : null;

  let scoreText: string;
  if (m.status === "scheduled") {
    scoreText = "vs";
  } else if (isCricket) {
    scoreText = `${formatCricketScore(m.homeScore, m.homeWickets)} - ${formatCricketScore(m.awayScore, m.awayWickets)}`;
  } else {
    scoreText = `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`;
  }

  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-2xl border border-[var(--border)]">
      {/* Backgrounds */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0b1120 0%, #1a2235 55%, #111827 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: isCricket
            ? "radial-gradient(circle at 20% 20%, rgba(20,184,166,0.35), transparent 60%)"
            : "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.35), transparent 60%)",
        }}
      />

      {/* Clickable content — div, not Link, to avoid nested <a> */}
      <div
        className="relative flex h-full w-full cursor-pointer flex-col p-6"
        onClick={() => navigate(`/match/${m.id}`)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--accent-cricket)]">
            {m.metadata?.competitionName ?? m.sport}
          </span>
          {isLive && <StatusBadge status="live" />}
        </div>

        <div className="mt-3 flex flex-1 items-center gap-4">
          <div className="flex items-center gap-3">
            <TeamLogo size="lg" name={m.homeTeam} flagUrl={homeFlag} crestUrl={homeCrest} />
            <div className="text-xl font-bold">{m.homeTeam}</div>
          </div>
          <div className="text-3xl font-black tabular-nums">
            {m.status === "scheduled" ? formatMatchStatus(m) : scoreText}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold">{m.awayTeam}</div>
            <TeamLogo size="lg" name={m.awayTeam} flagUrl={awayFlag} crestUrl={awayCrest} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Link
              to="/cricket"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg bg-[var(--accent-cricket)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              Explore Cricket
            </Link>
            <Link
              to="/football"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg bg-[var(--accent-football)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              Explore Football
            </Link>
          </div>
          {slides.length > 1 && (
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdx(i);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx
                      ? "w-6 bg-[var(--text-primary)]"
                      : "w-1.5 bg-[var(--text-secondary)]"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}