import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Match } from "@/types";
import MatchCard from "./MatchCard";
import EmptyState from "@/components/ui/EmptyState";

export default function SectionRow({
  title,
  matches,
  viewAllTo,
  emptyText = "No matches",
}: {
  title: string;
  matches: Match[];
  viewAllTo?: string;
  emptyText?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        <div className="flex items-center gap-1">
          {viewAllTo && (
            <Link
              to={viewAllTo}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              View All
            </Link>
          )}
          <button
            onClick={() => scrollBy(-260)}
            className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollBy(260)}
            className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {matches.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <div
          ref={scrollRef}
          className="scrollbar-none flex gap-3 overflow-x-auto pb-1 md:max-w-[calc(280px*3.5+12px*3)]"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}

    </section>
  );
}
