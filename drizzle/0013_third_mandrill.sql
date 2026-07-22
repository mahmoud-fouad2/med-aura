CREATE TABLE "push_token" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"platform" text DEFAULT 'android' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_token" ADD CONSTRAINT "push_token_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_token_token_idx" ON "push_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "push_token_user_idx" ON "push_token" USING btree ("userId");