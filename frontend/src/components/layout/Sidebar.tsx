import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  House,
  Radio,
  CircleDot,
  Users,
  Trophy,
  Settings as SettingsIcon,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AvatarCircle } from "@/components/ui/CrestImage";
import { useThemeStore } from "@/store/theme";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof House;
  color?: string;
  live?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/live", label: "Live", icon: Radio, live: true },
  { to: "/cricket", label: "Cricket", icon: CircleDot, color: "var(--accent-cricket)" },
  { to: "/football", label: "Football", icon: CircleDot, color: "var(--accent-football)" },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/leagues", label: "Leagues", icon: Trophy },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-base)] transition-[width]",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center justify-between px-3 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-green)] text-sm font-bold text-black">
            S
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight">Sportify</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-3">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2">
            <Search size={14} className="text-[var(--text-secondary)]" />
            <input
              placeholder="Search matches..."
              className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
            />
          </div>
        </div>
      )}

      <nav className="mt-4 flex-1 space-y-1 px-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-[var(--text-secondary)] transition-colors",
                "hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
                isActive &&
                  "border-l-[3px] bg-[var(--bg-elevated)] text-[var(--text-primary)]",
              )
            }
            style={({ isActive }) =>
              isActive
                ? { borderLeftColor: item.color ?? "var(--accent-green)" }
                : undefined
            }
          >
            <item.icon
              size={18}
              style={item.color ? { color: item.color } : undefined}
              className="shrink-0"
            />
            {!collapsed && (
              <span className="flex flex-1 items-center gap-2">
                {item.label}
                {item.live && (
                  <span className="live-pulse ml-auto inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-red)]" />
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3 border-t border-[var(--border)] p-3">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
        >
          {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          {!collapsed && <span>{theme === "dark" ? "Dark" : "Light"} mode</span>}
        </button>
        {user ? (
          <div className="flex items-center gap-2">
            <AvatarCircle name={user.name} size={collapsed ? 28 : 34} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{user.name}</div>
                <button
                  onClick={() => logout()}
                  className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          !collapsed && (
            <Link
              to="/login"
              className="block rounded-lg bg-[var(--accent-football)] px-3 py-2 text-center text-xs font-semibold text-white hover:opacity-90"
            >
              Login / Sign Up
            </Link>
          )
        )}
      </div>
    </aside>
  );
}
