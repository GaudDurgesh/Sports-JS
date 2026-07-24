import { Clock } from "lucide-react";

export default function HeadToHeadTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
      <Clock size={32} className="text-[var(--text-secondary)]" />
      <div>
        <div className="text-sm font-semibold">Head to Head</div>
        <div className="mt-1 text-xs text-[var(--text-secondary)]">
          Historical match data coming in a future update.
        </div>
      </div>
    </div>
  );
}
