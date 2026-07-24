import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { register as registerApi } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await registerApi(name, email, password);
      login(token, user);
      toast.success(`Welcome, ${user.name}`);
      navigate("/", { replace: true });
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-green)] text-sm font-bold text-black">
              S
            </div>
            <span className="text-lg font-semibold">Sportify</span>
          </div>
          <h1 className="mt-4 text-xl font-bold">Create account</h1>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[var(--text-secondary)]">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-[var(--text-secondary)]">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-[var(--text-secondary)]">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-[var(--text-secondary)]">Confirm password</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        {error && (
          <div className="rounded-md bg-[var(--accent-red)]/10 px-3 py-2 text-xs text-[var(--accent-red)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[var(--accent-football)] py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create account"}
        </button>

        <div className="text-center text-xs text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--accent-football)] hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
