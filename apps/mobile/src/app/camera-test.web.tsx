import { NativeOnlyScreen } from "../components/native-only-screen"
import { useI18n } from "../lib/i18n"

export default function CameraTestWeb() {
  const { t, locale } = useI18n()
  return (
    <NativeOnlyScreen
      title={t.cameraTest.title}
      body={
        locale === "ar"
          ? "اختبار الكاميرا والمايكروفون متاح من تطبيق Med Aura على الجوال."
          : "Camera and microphone testing is available in the Med Aura mobile app."
      }
      icon="videocam-outline"
    />
  )
}