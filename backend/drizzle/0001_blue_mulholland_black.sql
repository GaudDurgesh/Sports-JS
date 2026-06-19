ALTER TABLE "matches" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_external_id_unique" UNIQUE("external_id");