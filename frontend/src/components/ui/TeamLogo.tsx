import { useState } from "react";
import { getTeamAbbr } from "@/utils/cricketUtils";

type Size = "sm" | "md" | "lg";

const SIZE_PX: Record<Size, number> = { sm: 24, md: 36, lg: 56 };
const TEXT_CLASS: Record<Size, string> = {
  sm: "text-[9px]",
  md: "text-[11px]",
  lg: "text-sm",
};

const PALETTE = [
  "#14B8A6", // teal
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#A855F7", // purple
  "#22C55E", // green
  "#EF4444", // red
];

function colorFor(name: string): string {
  const c = name.trim().charCodeAt(0) || 0;
  return PALETTE[c % PALETTE.length];
}

export default function TeamLogo({
  name,
  flagUrl,
  crestUrl,
  size = "md",
}: {
  name: string;
  flagUrl?: string | null;
  crestUrl?: string | null;
  size?: Size;
}) {
  const [failed, setFailed] = useState(false);
  const px = SIZE_PX[size];
  const src = !failed ? (flagUrl || crestUrl || null) : null;
  const isFlag = !!flagUrl && !failed;

  if (src) {
    return (
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-elevated)]"
        style={{ width: px, height: px }}
      >
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          className={
            isFlag
              ? "h-full w-full rounded-full object-cover"
              : "h-full w-full object-contain p-1"
          }
        />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${TEXT_CLASS[size]}`}
      style={{ width: px, height: px, background: colorFor(name) }}
    >
      {getTeamAbbr(name)}
    </div>
  );
}
