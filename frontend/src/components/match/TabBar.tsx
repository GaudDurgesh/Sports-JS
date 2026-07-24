import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
}

export default function TabBar({
  tabs,
  active,
  onChange,
  accent = "var(--accent-football)",
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  accent?: string;
}) {
  return (
    <div className="flex gap-1 border-b border-[var(--border)]">
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm transition-colors",
              isActive
                ? "font-semibold text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {t.label}
            {isActive && (
              <span
                className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full"
                style={{ background: accent }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
