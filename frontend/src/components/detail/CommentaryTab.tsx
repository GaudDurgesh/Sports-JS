import { Lock } from "lucide-react";

export default function CommentaryTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
      <Lock size={32} className="text-[var(--text-secondary)]" />
      <div>
        <div className="text-sm font-semibold">Live Commentary</div>
        <div className="mt-1 text-xs text-[var(--text-secondary)]">
          Available with premium data plan
        </div>
      </div>
    </div>
  );
}
