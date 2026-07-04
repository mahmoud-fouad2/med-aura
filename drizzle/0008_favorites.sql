-- Patient favourites: single flat table with a `kind` column disambiguating
-- doctor / center / procedure. Toggle is idempotent via the composite unique
-- index.

CREATE TABLE "favorite" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "refId" text NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX "favorite_uniq" ON "favorite" ("userId", "kind", "refId");
--> statement-breakpoint
CREATE INDEX "favorite_user_idx" ON "favorite" ("userId");
