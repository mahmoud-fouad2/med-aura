import { NativeOnlyScreen } from "../../../components/native-only-screen"
import { useI18n } from "../../../lib/i18n"

export default function VideoConsultationWeb() {
  const { t, locale } = useI18n()
  return (
    <NativeOnlyScreen
      title={t.video.preTitle}
      body={
        locale === "ar"
          ? "الاستشارة المرئية متاحة من تطبيق Med Aura على الجوال."
          : "Video consultation is available in the Med Aura mobile app."
      }
      icon="videocam-outline"
    />
  )
}