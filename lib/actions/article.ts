"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { article, type Article } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { validation, notFound, toSafeError } from "@/lib/errors"

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }

const articleInputSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(3, "الرابط اللطيف يجب أن يكون 3 أحرف على الأقل")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "الرابط اللطيف يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط"),
  titleAr: z.string().min(5, "العنوان بالعربية مطلوب"),
  titleEn: z.string().min(5, "العنوان بالإنجليزية مطلوب"),
  excerptAr: z.string().min(10, "المقتطف بالعربية مطلوب"),
  excerptEn: z.string().min(10, "المقتطف بالإنجليزية مطلوب"),
  contentAr: z.string().min(20, "محتوى المقال بالعربية مطلوب"),
  contentEn: z.string().min(20, "محتوى المقال بالإنجليزية مطلوب"),
  coverImage: z.string().min(1, "صورة الغلاف مطلوبة"),
  category: z.string().default("seo_geo"),
  countryCode: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  authorNameAr: z.string().default("فريق Med Aura الطبي"),
  authorNameEn: z.string().default("Med Aura Medical Editorial"),
  readTimeMinutes: z.coerce.number().int().min(1).default(5),
  seoTitleAr: z.string().optional().nullable(),
  seoTitleEn: z.string().optional().nullable(),
  seoDescriptionAr: z.string().optional().nullable(),
  seoDescriptionEn: z.string().optional().nullable(),
  published: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
})

export type ArticleInput = z.infer<typeof articleInputSchema>

export async function upsertArticleAction(
  input: ArticleInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CATALOG_MANAGE)

    const parsed = articleInputSchema.safeParse(input)
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ")
      throw validation(msg)
    }

    const data = parsed.data
    const meta = await requestMeta()

    let articleId = data.id

    if (articleId) {
      // Update existing article
      const existing = (
        await db.select().from(article).where(eq(article.id, articleId)).limit(1)
      )[0]
      if (!existing) throw notFound("المقال غير موجود.")

      await db
        .update(article)
        .set({
          slug: data.slug,
          titleAr: data.titleAr,
          titleEn: data.titleEn,
          excerptAr: data.excerptAr,
          excerptEn: data.excerptEn,
          contentAr: data.contentAr,
          contentEn: data.contentEn,
          coverImage: data.coverImage,
          category: data.category,
          countryCode: data.countryCode ? data.countryCode.toUpperCase() : null,
          tags: data.tags,
          authorNameAr: data.authorNameAr,
          authorNameEn: data.authorNameEn,
          readTimeMinutes: data.readTimeMinutes,
          seoTitleAr: data.seoTitleAr,
          seoTitleEn: data.seoTitleEn,
          seoDescriptionAr: data.seoDescriptionAr,
          seoDescriptionEn: data.seoDescriptionEn,
          published: data.published,
          featured: data.featured,
          sortOrder: data.sortOrder,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(article.id, articleId))

      await writeAudit({
        action: "article.update",
        actorUserId: user.id,
        entityType: "article",
        entityId: articleId,
        metadata: { slug: data.slug },
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
    } else {
      // Create new article
      const inserted = await db
        .insert(article)
        .values({
          slug: data.slug,
          titleAr: data.titleAr,
          titleEn: data.titleEn,
          excerptAr: data.excerptAr,
          excerptEn: data.excerptEn,
          contentAr: data.contentAr,
          contentEn: data.contentEn,
          coverImage: data.coverImage,
          category: data.category,
          countryCode: data.countryCode ? data.countryCode.toUpperCase() : null,
          tags: data.tags,
          authorNameAr: data.authorNameAr,
          authorNameEn: data.authorNameEn,
          readTimeMinutes: data.readTimeMinutes,
          seoTitleAr: data.seoTitleAr,
          seoTitleEn: data.seoTitleEn,
          seoDescriptionAr: data.seoDescriptionAr,
          seoDescriptionEn: data.seoDescriptionEn,
          published: data.published,
          featured: data.featured,
          sortOrder: data.sortOrder,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning({ id: article.id })

      articleId = inserted[0].id

      await writeAudit({
        action: "article.create",
        actorUserId: user.id,
        entityType: "article",
        entityId: articleId,
        metadata: { slug: data.slug },
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
    }

    try {
      revalidatePath("/blog")
      revalidatePath(`/blog/${data.slug}`)
      revalidatePath("/admin/articles")
      revalidatePath("/")
    } catch {}

    return { ok: true, data: { id: articleId, slug: data.slug } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function toggleArticlePublishedAction(
  id: string,
  published: boolean,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CATALOG_MANAGE)

    const updated = await db
      .update(article)
      .set({ published, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(article.id, id))
      .returning({ slug: article.slug })

    if (updated.length === 0) throw notFound("المقال غير موجود.")

    const meta = await requestMeta()
    await writeAudit({
      action: published ? "article.publish" : "article.unpublish",
      actorUserId: user.id,
      entityType: "article",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })

    try {
      revalidatePath("/blog")
      revalidatePath(`/blog/${updated[0].slug}`)
      revalidatePath("/admin/articles")
      revalidatePath("/")
    } catch {}

    return { ok: true, data: null }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function toggleArticleFeaturedAction(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CATALOG_MANAGE)

    await db
      .update(article)
      .set({ featured, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(article.id, id))

    try {
      revalidatePath("/")
      revalidatePath("/blog")
      revalidatePath("/admin/articles")
    } catch {}

    return { ok: true, data: null }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CATALOG_MANAGE)

    const deleted = await db
      .delete(article)
      .where(eq(article.id, id))
      .returning({ slug: article.slug })

    if (deleted.length === 0) throw notFound("المقال غير موجود.")

    const meta = await requestMeta()
    await writeAudit({
      action: "article.delete",
      actorUserId: user.id,
      entityType: "article",
      entityId: id,
      metadata: { slug: deleted[0].slug },
      ip: meta.ip,
      userAgent: meta.userAgent,
    })

    try {
      revalidatePath("/blog")
      revalidatePath("/admin/articles")
      revalidatePath("/")
    } catch {}

    return { ok: true, data: null }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
