import {
  pgEnum,
  pgTable,
  serial,
  text,
  integer,
  timestamp,   // ← used for created_at / updated_at (server-local, fine)
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
]);

// ─── Matches ──────────────────────────────────────────────────────────────────
// FIX: startTime / endTime must be TIMESTAMPTZ (timestamp with time zone).
//
// The previous schema used plain `timestamp` (no TZ). PostgreSQL stores that
// as "local" time with no offset information, which means when JavaScript
// passes a UTC Date (from CricAPI's `dateTimeGMT` or football-data's
// `utcDate`), Drizzle serialises it as an ISO string, PG strips the "Z",
// and reads it back as if it were *local* time — correct on a UTC server
// but wrong (off by +5:30) on any IST server or when the process's TZ
// env-var is set to Asia/Kolkata.  `{ withTimezone: true }` tells PG to
// store the offset and always return a UTC-normalised value.
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  sport: text("sport").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  status: matchStatusEnum("status").notNull(),

  // ✅ FIXED: was timestamp (no TZ), now timestamptz
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time",   { withTimezone: true }),

  homeScore: integer("home_score").default(0).notNull(),
  awayScore: integer("away_score").default(0).notNull(),
  metadata: jsonb("metadata"),
  externalId: text("external_id").unique(),

  // Server-generated timestamps — plain timestamp is fine here
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Commentary ───────────────────────────────────────────────────────────────
export const commentary = pgTable("commentary", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .references(() => matches.id)
    .notNull(),
  minute: integer("minute").notNull(),
  sequence: integer("sequence").notNull(),
  period: text("period").notNull(),
  eventType: text("event_type").notNull(),
  actor: text("actor"),
  team: text("team"),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  tags: text("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const matchesRelations = relations(matches, ({ many }) => ({
  commentary: many(commentary),
}));

export const commentaryRelations = relations(commentary, ({ one }) => ({
  match: one(matches, {
    fields: [commentary.matchId],
    references: [matches.id],
  }),
}));