import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Pressable, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import Daily, {
  DailyMediaView,
  type DailyCall,
  type DailyParticipant,
} from "@daily-co/react-native-daily-js"
import { AppText, Button } from "../components/ui"
import { api } from "../lib/api"
import { colors, radius, spacing } from "../theme"

/**
 * QA-ONLY join screen for the admin "جلسة فيديو تجريبية" tool — opened via
 * the `medaura://qa-video?...` deep link the admin panel hands to each test
 * device. Mirrors appointment/[id]/video.tsx's in-call UI (same controls,
 * same Daily plumbing) but the room/token come straight from the link
 * instead of an appointment lookup; there is no prejoin gate to check
 * because the server already scoped this to a 30-minute isTest-only room.
 */

type Phase = "joining" | "call" | "ended" | "error"

export default function QaVideo() {
  const { room, url, token, role } = useLocalSearchParams<{
    room: string
    url: string
    token: string
    role: "patient" | "doctor"
  }>()
  const insets = useSafeAreaInsets()
  const missingParams = !room || !url || !token || !role

  const [phase, setPhase] = useState<Phase>(missingParams ? "error" : "joining")
  const callRef = useRef<DailyCall | null>(null)
  const [remote, setRemote] = useState<DailyParticipant | null>(null)
  const [local, setLocal] = useState<DailyParticipant | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)

  const teardown = useCallback(async () => {
    const call = callRef.current
    callRef.current = null
    if (!call) return
    try {
      await call.leave()
    } catch {
      /* already left */
    }
    try {
      await call.destroy()
    } catch {
      /* already destroyed */
    }
  }, [])

  useEffect(() => {
    return () => {
      void teardown()
    }
  }, [teardown])

  useEffect(() => {
    if (missingParams) return
    let cancelled = false
    async function join() {
      try {
        const call = Daily.createCallObject()
        callRef.current = call

        const refresh = () => {
          const all = call.participants()
          setLocal(all.local ?? null)
          setRemote(Object.values(all).find((p) => p && !p.local) ?? null)
        }
        call.on("participant-joined", refresh)
        call.on("participant-updated", refresh)
        call.on("participant-left", refresh)
        call.on("left-meeting", () => {
          if (cancelled) return
          setPhase((current) => (current === "call" ? "ended" : current))
        })
        call.on("error", () => {
          if (cancelled) return
          setPhase("error")
          void teardown()
        })

        await call.join({ url, token })
        if (cancelled) return
        refresh()
        setPhase("call")
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        void api.qaVideoEvent(room, role === "doctor" ? "doctor_joined" : "patient_joined")
      } catch {
        if (!cancelled) setPhase("error")
      }
    }
    void join()
    return () => {
      cancelled = true
    }
    // Only ever runs once per deep link — the params are stable for the
    // lifetime of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const leave = useCallback(async () => {
    void api.qaVideoEvent(room, role === "doctor" ? "doctor_left" : "patient_left")
    await teardown()
    setPhase("ended")
  }, [room, role, teardown])

  if (phase === "error") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.screen,
          gap: spacing.md,
        }}
      >
        <AppText variant="body" color={colors.danger}>
          تعذّر الدخول إلى جلسة الاختبار. تأكد من أن الرابط لم تنتهِ صلاحيته.
        </AppText>
        <Button label="رجوع" onPress={() => router.back()} />
      </View>
    )
  }

  if (phase === "ended") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.screen,
          gap: spacing.md,
        }}
      >
        <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
        <AppText variant="body" weight="bold">
          انتهت جلسة الاختبار
        </AppText>
        <Button label="رجوع" onPress={() => router.back()} />
      </View>
    )
  }

  const remoteTrack = remote?.tracks.video?.track ?? null
  const remoteAudio = remote?.tracks.audio?.track ?? null
  const localTrack = local?.tracks.video?.track ?? null

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      {remoteTrack ? (
        <DailyMediaView
          videoTrack={remoteTrack}
          audioTrack={remoteAudio}
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
            gap: spacing.md,
          }}
        >
          <ActivityIndicator color="#FFFFFF" />
          <AppText variant="sub" color="rgba(255,255,255,0.8)">
            {phase === "joining" ? "جارٍ الاتصال…" : "بانتظار الطرف الآخر…"}
          </AppText>
        </View>
      )}

      {phase === "call" && localTrack && camOn ? (
        <View
          style={{
            position: "absolute",
            top: insets.top + spacing.md,
            end: spacing.md,
            width: 104,
            height: 148,
            borderRadius: radius.lg,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.35)",
          }}
        >
          <DailyMediaView
            videoTrack={localTrack}
            audioTrack={null}
            mirror
            objectFit="cover"
            zOrder={1}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}

      <View
        style={{
          position: "absolute",
          top: insets.top + spacing.md,
          start: spacing.md,
        }}
      >
        <AppText variant="sub" weight="bold" color="#FFFFFF">
          اختبار فيديو — {role === "doctor" ? "طبيب" : "مريض"}
        </AppText>
      </View>

      {phase === "call" ? (
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + spacing.xl,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            gap: spacing.lg,
          }}
        >
          <RoundControl
            icon={micOn ? "mic" : "mic-off"}
            active={micOn}
            onPress={toggleMic}
          />
          <RoundControl
            icon={camOn ? "videocam" : "videocam-off"}
            active={camOn}
            onPress={toggleCam}
          />
          <RoundControl icon="camera-reverse" active onPress={flipCamera} />
          <RoundControl icon="call" danger onPress={() => void leave()} />
        </View>
      ) : null}
    </View>
  )
}

function RoundControl({
  icon,
  onPress,
  active = false,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: danger
          ? colors.danger
          : active
            ? "rgba(255,255,255,0.22)"
            : "rgba(255,255,255,0.10)",
        transform: [{ scale: pressed ? 0.93 : 1 }],
      })}
    >
      <Ionicons name={icon} size={22} color="#FFFFFF" />
    </Pressable>
  )
}
