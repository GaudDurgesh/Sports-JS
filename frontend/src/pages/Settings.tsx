import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AvatarCircle } from "@/components/ui/CrestImage";
import { useThemeStore } from "@/store/theme";
import { Moon, Sun } from "lucide-react";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`h-6 w-10 rounded-full transition-colors ${
        checked ? "bg-[var(--accent-football)]" : "bg-[var(--bg-elevated)]"
      }`}
    >
      <span
        className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [reminders, setReminders] = useState(true);
  const [scores, setScores] = useState(true);
  const [goals, setGoals] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-4 text-sm font-semibold">Account</h2>
        <div className="flex items-center gap-4">
          <AvatarCircle name={user?.name ?? "?"} size={56} />
          <div className="flex-1">
            <div className="text-base font-semibold">{user?.name}</div>
            <div className="text-xs text-[var(--text-secondary)]">{user?.email}</div>
          </div>
          <button className="rounded-md bg-[var(--bg-elevated)] px-3 py-1.5 text-xs">
            Edit Profile
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-4 text-sm font-semibold">Appearance</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === "dark" ? "Dark" : "Light"} mode</span>
          </div>
          <Toggle checked={theme === "dark"} onChange={toggleTheme} />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-4 text-sm font-semibold">Notifications</h2>
        <div className="space-y-3">
          {[
            { label: "Match Reminders", v: reminders, s: setReminders },
            { label: "Score Updates", v: scores, s: setScores },
            { label: "Goal Alerts", v: goals, s: setGoals },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-sm">{row.label}</span>
              <Toggle checked={row.v} onChange={row.s} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--accent-red)]/40 bg-[var(--bg-card)] p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--accent-red)]">Danger Zone</h2>
        <button
          onClick={async () => {
            await logout();
            navigate("/login", { replace: true });
          }}
          className="rounded-md bg-[var(--accent-red)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Log Out
        </button>
      </section>
    </div>
  );
}
