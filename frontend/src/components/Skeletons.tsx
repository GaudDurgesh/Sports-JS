// src/components/Skeletons.tsx
// All skeleton/loading states in one place — import what you need.

// ─── Shared pulse wrapper ─────────────────────────────────────────────────────
function Pulse({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="animate-pulse" style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  )
}

// ─── Home page: single match card skeleton ────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-5 animate-pulse">
      <div className="flex justify-between mb-5">
        <div className="h-4 w-14 rounded-full bg-white/[0.08]" />
        <div className="h-4 w-10 rounded-full bg-white/[0.08]" />
      </div>
      <div className="h-12 rounded-xl bg-white/[0.08] mb-4" />
      <div className="flex justify-between">
        <div className="h-3 w-20 rounded bg-white/[0.06]" />
        <div className="h-3 w-14 rounded bg-white/[0.06]" />
      </div>
    </div>
  )
}

// ─── Home page: full grid skeleton ───────────────────────────────────────────
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// ─── Match detail: score header skeleton ─────────────────────────────────────
export function SkeletonHeader() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 animate-pulse">
      <div className="flex justify-between mb-6">
        <div className="h-4 w-20 rounded-lg bg-white/[0.08]" />
        <div className="h-6 w-16 rounded-full bg-white/[0.08]" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-5 items-center">
        <div className="flex flex-col gap-3">
          <div className="h-3.5 w-28 rounded-md bg-white/[0.08]" />
          <div className="h-12 w-16 rounded-lg bg-white/[0.06]" />
        </div>
        <div className="w-px h-20 bg-white/[0.06]" />
        <div className="flex flex-col gap-3 items-end">
          <div className="h-3.5 w-28 rounded-md bg-white/[0.08]" />
          <div className="h-12 w-16 rounded-lg bg-white/[0.06]" />
        </div>
      </div>
    </div>
  )
}

// ─── Match detail: commentary feed skeleton ───────────────────────────────────
export function SkeletonFeed({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <Pulse key={i} delay={i * 0.1}>
          <div className="flex gap-3 py-3.5 pl-3.5 border-b border-white/[0.04] border-l-[3px] border-l-white/[0.06]">
            <div className="w-16 flex flex-col items-end gap-1.5">
              <div className="h-3 w-12 rounded bg-white/[0.07]" />
              <div className="h-5 w-5 rounded-full bg-white/[0.07]" />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3 w-2/5 rounded bg-white/[0.08]" />
              <div className="h-3 w-4/5 rounded bg-white/[0.05]" />
            </div>
          </div>
        </Pulse>
      ))}
    </div>
  )
}