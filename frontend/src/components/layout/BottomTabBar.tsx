import { NavLink } from "react-router-dom";
import { House, Radio, CircleDot, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/live", label: "Live", icon: Radio, end: false },
  { to: "/cricket", label: "Cricket", icon: CircleDot, end: false, color: "var(--accent-cricket)" },
  { to: "/football", label: "Football", icon: CircleDot, end: false, color: "var(--accent-football)" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, end: false },
];

export default function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-[var(--border)] bg-[var(--bg-card)]">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px]",
              isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
            )
          }
        >
          <t.icon size={18} style={t.color ? { color: t.color } : undefined} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
