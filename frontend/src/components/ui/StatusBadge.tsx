import type { MatchStatus } from "@/types";

export default function StatusBadge({ status }: { status: MatchStatus }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-live)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-live)]">
        <span className="live-pulse inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-live)]" />
        Live
      </span>
    );
  }
  if (status === "scheduled") {
    return (
      <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        Upcoming
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
      Full time
    </span>
  );
}
