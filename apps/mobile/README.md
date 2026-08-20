# Med Aura Mobile

تطبيق Med Aura للمرضى والأطباء، مبني باستخدام Expo SDK 57 وExpo Router.

## التشغيل المحلي

من جذر المستودع:

```bash
corepack pnpm install
corepack pnpm --dir apps/mobile start
```

يضبط التطبيق الخادم الافتراضي من `src/lib/config.ts`. لاختبار خادم محلي، مرر:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000 corepack pnpm --dir apps/mobile start
```

على جهاز حقيقي استخدم عنوان الشبكة المحلية بدل `localhost`. تحتاج إشعارات Android واختبارات Daily/WebRTC إلى development build؛ Expo Go لا يدعم push notifications على Android في هذا الإصدار.

## اختبار الفيديو

عند تفعيل أدوات Video QA، أنشئ الجلسة من لوحة الإدارة ثم افتح رابط المريض أو الطبيب على جهاز مسجل بالحساب المحدد. الرابط صالح لاستخدام واحد، ويستبدله التطبيق بتصريح فيديو قصير العمر بعد التحقق من الحساب؛ لا يحتوي الرابط على Daily token أو عنوان الغرفة.

## الفحوصات

```bash
corepack pnpm --dir apps/mobile test
corepack pnpm --dir apps/mobile typecheck
corepack pnpm --dir apps/mobile lint
corepack pnpm --dir apps/mobile exec expo-doctor
```

## الإصدارات

رقم إصدار المتجر و`versionCode` موجودان في `app.json`. إعدادات EAS في `eas.json`، وتفاصيل البناء والتوقيع في وثائق المشروع تحت `docs/`.
