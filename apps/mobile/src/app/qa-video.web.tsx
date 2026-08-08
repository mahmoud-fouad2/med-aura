import { NativeOnlyScreen } from "../components/native-only-screen"
import { useI18n } from "../lib/i18n"

export default function QaVideoWeb() {
  const { locale } = useI18n()
  return (
    <NativeOnlyScreen
      title={locale === "ar" ? "فحص الاستشارة المرئية" : "Video consultation check"}
      body={
        locale === "ar"
          ? "فحص الفيديو متاح من تطبيق Med Aura على الجوال."
          : "Video testing is available in the Med Aura mobile app."
      }
      icon="videocam-outline"
    />
  )
}