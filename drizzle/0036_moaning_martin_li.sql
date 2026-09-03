CREATE TABLE "article" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"titleAr" text NOT NULL,
	"titleEn" text NOT NULL,
	"excerptAr" text NOT NULL,
	"excerptEn" text NOT NULL,
	"contentAr" text NOT NULL,
	"contentEn" text NOT NULL,
	"coverImage" text NOT NULL,
	"category" text DEFAULT 'seo_geo' NOT NULL,
	"countryCode" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"authorNameAr" text DEFAULT 'فريق Med Aura الطبي' NOT NULL,
	"authorNameEn" text DEFAULT 'Med Aura Medical Editorial' NOT NULL,
	"readTimeMinutes" integer DEFAULT 5 NOT NULL,
	"seoTitleAr" text,
	"seoTitleEn" text,
	"seoDescriptionAr" text,
	"seoDescriptionEn" text,
	"published" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text,
	CONSTRAINT "article_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "article_published_idx" ON "article" USING btree ("published");--> statement-breakpoint
CREATE INDEX "article_featured_idx" ON "article" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "article_country_idx" ON "article" USING btree ("countryCode");--> statement-breakpoint
CREATE UNIQUE INDEX "article_slug_idx" ON "article" USING btree ("slug");