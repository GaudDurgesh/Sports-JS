import { AlertCircle } from "lucide-react";

export default function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border p-8 text-center">
      <AlertCircle className="text-[var(--accent-red)]" size={32} />
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md bg-[var(--bg-elevated)] px-3 py-1.5 text-sm text-[var(--text-primary)] hover:opacity-90"
        >
          Retry
        </button>
      )}
    </div>
  );
}
