import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--text-secondary)]" size={28} />
      </div>
    );
  }
  if (!token || !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
