import { pgTable, text, integer, boolean, index } from "drizzle-orm/pg-core"
import { lifecycle } from "./_shared"

/** Public contact-form submissions (stored, never faked). */
export const contactMessage = pgTable(
  "contact_message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    // new | read | archived
    status: text("status").notNull().default("new"),
    handledBy: text("handledBy"),
    ...lifecycle(),
  },
  (t) => [index("contact_status_idx").on(t.status)],
)

/** FAQ entries, managed by content admins; rendered on /faq. */
export const faq = pgTable(
  "faq",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    questionAr: text("questionAr").notNull(),
    answerAr: text("answerAr").notNull(),
    category: text("category").notNull().default("general"),
    sortOrder: integer("sortOrder").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    ...lifecycle(),
  },
  (t) => [index("faq_visible_idx").on(t.visible)],
)
