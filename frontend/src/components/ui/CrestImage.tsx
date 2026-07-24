import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/lib/utils";

export default function CrestImage({
  src,
  name,
  size = 32,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[10px] font-semibold text-[var(--text-primary)]"
        style={{ width: size, height: size }}
      >
        {getInitials(name)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="rounded-full object-contain"
    />
  );
}

export function AvatarCircle({ name, size = 36 }: { name?: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)]"
      style={{ width: size, height: size }}
    >
      {getInitials(name ?? "?")}
    </div>
  );
}

export function useAuthUser() {
  return useAuth();
}
