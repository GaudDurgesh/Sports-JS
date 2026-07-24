import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  subtitle,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border p-10 text-center">
      <Icon className="text-[var(--text-secondary)]" size={32} />
      <div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        {subtitle && (
          <div className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
