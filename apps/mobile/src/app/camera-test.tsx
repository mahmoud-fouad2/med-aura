import { useCallback, useEffect, useRef, useState } from "react"
import { Linking, Pressable, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import Daily, {
  DailyMediaView,
  type DailyCall,
  type DailyEventObjectCameraError,
  type DailyEventObjectLocalAudioLevel,
  type MediaStreamTrack,
} from "@daily-co/react-native-daily-js"
import { AppText, Button, ChevronBack } from "../components/ui"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

/**
 * Purely local device check — no appointment, no Daily room, no token, no
 * server call of any kind. `startCamera()` only ever touches the device's
 * own camera/mic; it never dials into a meeting (that needs `.join()`,
 * which this screen never calls). Safe to leave in the app permanently.
 */

type Phase = "intro" | "starting" | "preview" | "denied" | "error"

export default function CameraTest() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()

  const [phase, setPhase] = useState<Phase>("intro")
  const [canAskAgain, setCanAskAgain] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [audioLevel, setAudioLevel] = useState(0)
  const [localTrack, setLocalTrack] = useState<MediaStreamTrack | null>(null)

  const callRef = useRef<DailyCall | null>(null)

  const teardown = useCallback(async () => {
    const call = callRef.current
    callRef.current = null
    if (!call) return
    try {
      call.stopLocalAudioLevelObserver()
    } catch {
      /* wasn't running */
    }
    try {
      await call.leave()
    } catch {
      /* never joined a meeting — nothing to leave */
    }
    try {
      await call.destroy()
    } catch {
      /* already destroyed */
    }
  }, [])

  // Backgrounding, navigating away, or unmounting for any reason must always
  // release the camera — Android's camera-in-use indicator must never
  // outlive this screen.
  useEffect(() => {
    return () => {
      void teardown()
    }
  }, [teardown])

  const start = useCallback(async () => {
    setPhase("starting")
    try {
      const call = Daily.createCallObject()
      callRef.current = call

      const refresh = () => {
        const local = call.participants().local
        setLocalTrack(local?.tracks.video?.track ?? null)
      }
      call.on("participant-updated", refresh)
      call.on("local-audio-level", (ev?: DailyEventObjectLocalAudioLevel) => {
        setAudioLevel(ev?.audioLevel ?? 0)
      })
      call.on("camera-error", (ev?: DailyEventObjectCameraError) => {
        const permanentlyBlocked =
          ev?.error?.type === "permissions" &&
          (ev.error as { blockedBy?: "user" | "browser" }).blockedBy === "browser"
        setCanAskAgain(!permanentlyBlocked)
        setPhase("denied")
      })

      await call.startCamera({ userName: "camera-test", startVideoOff: false, startAudioOff: false })
      await call.startLocalAudioLevelObserver(200)
      refresh()
      setPhase("preview")
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      await teardown()
      setPhase("denied")
    }
  }, [teardown])

  const toggleMic = useCallback(() => {
    const call = callRef.current
    if (!call) return
    const next = !micOn
    call.setLocalAudio(next)
    setMicOn(next)
    void Haptics.selectionAsync()
  }, [micOn])

  const toggleCam = useCallback(() => {
    const call = callRef.current
    if (!call) return
    const next = !camOn
    call.setLocalVideo(next)
    setCamOn(next)
    void Haptics.selectionAsync()
  }, [camOn])

  const flipCamera = useCallback(() => {
    void callRef.current?.cycleCamera()
    void Haptics.selectionAsync()
  }, [])

  const toggleSpeaker = useCallback(() => {
    const call = callRef.current
    if (!call) return
    const next = !speakerOn
    void call.setAudioDevice(next ? "speakerphone" : "earpiece").catch(() => undefined)
    setSpeakerOn(next)
    void Haptics.selectionAsync()
  }, [speakerOn])

  const finish = useCallback(async () => {
    await teardown()
    router.back()
  }, [teardown])

  /* ── Preview / call-controls phase ───────────────────────────────────── */

  if (phase === "preview") {
    const level = Math.min(1, audioLevel * 6) // Daily's scale reads quiet in normal speech; amplify for a visible meter.
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink }}>
        {localTrack && camOn ? (
          <DailyMediaView
            videoTrack={localTrack}
            audioTrack={null}
            mirror
            objectFit="cover"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="videocam-off"
              size={48}
              color="rgba(255,255,255,0.6)"
            />
          </View>
        )}

        <View
          style={{
            position: "absolute",
            top: insets.top + spacing.md,
            start: spacing.md,
            end: spacing.md,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <AppText variant="sub" weight="bold" color="#FFFFFF">
            {t.cameraTest.title}
          </AppText>
          {/* Mic-level meter: a simple filled bar, not a technical dB readout —
              its only job is "yes, the microphone is picking up sound". */}
          <View
            style={{
              width: 64,
              height: 8,
              borderRadius: radius.full,
              backgroundColor: "rgba(255,255,255,0.2)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.round(level * 100)}%`,
                height: "100%",
                borderRadius: radius.full,
                backgroundColor: micOn ? colors.success : "rgba(255,255,255,0.3)",
              }}
            />
          </View>
        </View>

        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + spacing.xl,
            left: 0,
            right: 0,
            gap: spacing.lg,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.lg }}>
            <RoundControl
              icon={micOn ? "mic" : "mic-off"}
              active={micOn}
              label={micOn ? t.video.micOn : t.video.micOff}
              onPress={toggleMic}
            />
            <RoundControl
              icon={camOn ? "videocam" : "videocam-off"}
              active={camOn}
              label={camOn ? t.video.camOn : t.video.camOff}
              onPress={toggleCam}
            />
            <RoundControl
              icon="camera-reverse"
              active
              label={t.video.flipCamera}
              onPress={flipCamera}
            />
            <RoundControl
              icon={speakerOn ? "volume-high" : "volume-low"}
              active={speakerOn}
              label={t.video.speaker}
              onPress={toggleSpeaker}
            />
          </View>
          <View style={{ paddingHorizontal: spacing.screen }}>
            <Button
              label={t.cameraTest.endTest}
              onPress={() => void finish()}
              style={{ backgroundColor: colors.danger }}
            />
          </View>
        </View>
      </View>
    )
  }

  /* ── Denied / error / intro ───────────────────────────────────────────── */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.md,
      }}
    >
      <View
        style={{
          paddingHorizontal: spacing.screen,
          paddingBottom: spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
          hitSlop={8}
        >
          <ChevronBack size={22} />
        </Pressable>
        <AppText variant="title" weight="heavy">
          {t.cameraTest.title}
        </AppText>
      </View>

      <View style={{ padding: spacing.screen, gap: spacing.lg }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="videocam-outline" size={28} color={colors.primary} />
        </View>

        <AppText variant="body" color={colors.textMuted}>
          {t.cameraTest.intro}
        </AppText>

        {phase === "denied" ? (
          <View
            style={{
              backgroundColor: colors.dangerSoft,
              borderRadius: radius.md,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <AppText variant="sub" color={colors.danger}>
              {t.cameraTest.permissionDenied}
            </AppText>
            {!canAskAgain ? (
              <Pressable onPress={() => void Linking.openSettings()} hitSlop={4}>
                <AppText variant="sub" weight="bold" color={colors.primary}>
                  {t.filters.openSettings}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {phase === "error" ? (
          <View style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.md }}>
            <AppText variant="sub" color={colors.danger}>
              {t.common.loadFailed}
            </AppText>
          </View>
        ) : null}

        <Button
          label={t.cameraTest.start}
          icon="videocam"
          loading={phase === "starting"}
          onPress={() => void start()}
        />
      </View>
    </View>
  )
}

function RoundControl({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  active?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)",
        transform: [{ scale: pressed ? 0.93 : 1 }],
      })}
    >
      <Ionicons name={icon} size={22} color="#FFFFFF" />
    </Pressable>
  )
}
