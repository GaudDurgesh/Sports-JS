CREATE TABLE "cricket_scorecards" (
	"match_id" integer PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"source_external_id" text NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"raw_data" jsonb NOT NULL,
	"data" jsonb NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cricket_scorecards" ADD CONSTRAINT "cricket_scorecards_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;