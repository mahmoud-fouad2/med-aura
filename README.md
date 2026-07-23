# Med Aura — منصة التجميل الطبي

منصة متخصصة حصريًا في **التجميل الطبي** تربط المرضى بأطباء ومراكز معتمدة وتدير
رحلة العميل من البحث حتى المتابعة بعد الإجراء. ليست دليل أطباء فقط، وليست منصة
لكل التخصصات الطبية.

> **الحالة:** الأساس (Foundation) ومسار رأسي كامل (Vertical Slice) يعملان من قاعدة
> البيانات حتى الواجهة. باقي الوحدات تُبنى تباعًا فوق نفس الأساس. انظر
> [docs/known-limitations.md](docs/known-limitations.md).

## التقنيات

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 + shadcn
(base-ui) · Better Auth · Drizzle ORM + PostgreSQL · Cloudflare R2 (S3) · Stripe
(test mode) · Vitest.

## المتطلبات

- Node 20+ (تم التطوير على Node 24)
- PostgreSQL 14+
- pnpm 9 (`corepack enable` أو `npx pnpm@9`)

## التشغيل محليًا

```bash
# 1) التبعيات
pnpm install

# 2) المتغيرات البيئية
cp .env.example .env.local
#    عيّن على الأقل: DATABASE_URL و BETTER_AUTH_SECRET
#    للدفع: STRIPE_SECRET_KEY و STRIPE_WEBHOOK_SECRET (وضع الاختبار)
#    للرفع: مفاتيح R2

# 3) قاعدة البيانات: توليد/تطبيق الـMigrations
pnpm db:generate     # موجود مسبقًا في drizzle/0000_init.sql
pnpm db:migrate

# 4) بيانات تطوير تجريبية (Development only)
pnpm db:seed

# 5) التشغيل
pnpm dev             # http://localhost:3000
```

### أوامر مفيدة

| الأمر | الوظيفة |
|------|---------|
| `pnpm typecheck` | فحص TypeScript (بدون تجاهل الأخطاء) |
| `pnpm build` | بناء إنتاجي (يفشل عند وجود أخطاء TS) |
| `pnpm test` | تشغيل الاختبارات (الوحدات + التكامل عند توفّر DB) |
| `pnpm db:health` | فحص الاتصال بقاعدة البيانات |
| `pnpm db:studio` | Drizzle Studio |

## حسابات تجريبية (بعد `db:seed`)

كلمة المرور للجميع: `MedAura#2026` — **بيانات تجريبية للتطوير فقط**.

| الحساب | الدور |
|--------|------|
| `admin@medauraworld.com` | Super Admin |
| `compliance@medauraworld.com` | مراجع اعتماد |
| `patient@medauraworld.com` | مريض اختبار |
| `doctor@medauraworld.com` | طبيب معتمد اختبار (ترخيص ساري) |
| `pending-doctor@medauraworld.com` | طلب انضمام اختبار بانتظار المراجعة |

## المسار الرأسي العامل (End-to-End)

1. مريض يسجّل (التسجيل العام = مريض فقط، لا يمكن منح النفس دورًا).
2. طبيب يقدّم طلب انضمام → مراجع الاعتماد يعتمده → يُنشر ويحصل على دور DOCTOR.
3. الطبيب المعتمد (بترخيص ساري) يظهر في `/search`؛ غير المعتمد/المنتهي ترخيصه لا يظهر.
4. المريض يفتح ملف الطبيب → ينشئ حالة تجميل أنف → يرفع صورًا خاصة (R2) →
   يمنح الطبيب صلاحية الاطلاع (Consent).
5. يحجز استشارة فيديو على موعد متاح (يستحيل الحجز المزدوج على مستوى قاعدة البيانات).
6. يدفع رسوم الاستشارة عبر Stripe (وضع الاختبار). **التأكيد يتم عبر Webhook
   موقّع ومتحقق منه — لا اعتماد على إعادة التوجيه ولا نجاح وهمي.**
7. عند تأكيد الدفع: الموعد → CONFIRMED والحالة → CONSULTATION_BOOKED، ويظهر
   الموعد في لوحتي المريض والطبيب.

> إذا لم تُضبط مفاتيح Stripe/R2، تعرض الواجهة بوضوح أن الخدمة «غير مفعّلة» بدل
> تزييف النجاح.

## الوثائق

- [docs/architecture.md](docs/architecture.md)
- [docs/database.md](docs/database.md)
- [docs/roles-and-permissions.md](docs/roles-and-permissions.md)
- [docs/provider-verification.md](docs/provider-verification.md)
- [docs/patient-journey.md](docs/patient-journey.md)
- [docs/appointment-flow.md](docs/appointment-flow.md)
- [docs/payment-flow.md](docs/payment-flow.md)
- [docs/file-access.md](docs/file-access.md)
- [docs/security.md](docs/security.md) · [docs/privacy.md](docs/privacy.md) · [docs/incident-response.md](docs/incident-response.md)
- [docs/testing.md](docs/testing.md) · [docs/deployment.md](docs/deployment.md)
- [docs/known-limitations.md](docs/known-limitations.md)
- التدقيق: [docs/audits/current-state.md](docs/audits/current-state.md) · [docs/audits/final-product-audit.md](docs/audits/final-product-audit.md)
