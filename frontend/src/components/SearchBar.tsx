// src/components/SearchBar.tsx
// Inline search bar for filtering matches by team name on the Home page.
// Controlled externally — passes value up via onChange.

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative flex items-center">
      {/* Magnifying glass icon */}
      <span
        className="absolute left-3 text-white/25 pointer-events-none select-none"
        style={{ fontSize: 13 }}
        aria-hidden
      >
        🔍
      </span>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search teams or matches…"
        className="
          w-52 pl-8 pr-3 py-1.5 rounded-full
          bg-white/[0.06] border border-white/10
          text-white/80 placeholder:text-white/25
          text-[13px] outline-none
          transition-all duration-200
          focus:w-64 focus:bg-white/[0.09] focus:border-white/20 focus:text-white/90
        "
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 text-white/30 hover:text-white/60 transition-colors cursor-pointer bg-transparent border-none p-0"
          aria-label="Clear search"
          style={{ fontSize: 12 }}
        >
          ✕
        </button>
      )}
    </div>
  );
}