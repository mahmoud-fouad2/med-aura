import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as WebBrowser from "expo-web-browser"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import Daily, {
  DailyMediaView,
  mediaDevices,
  type DailyCall,
  type DailyParticipant,
} from "@daily-co/react-native-daily-js"
import { AppText, Avatar, Button, Card, ChevronBack, Skeleton } from "../../../components/ui"
import { BottomSheet } from "../../../components/bottom-sheet"
import { api, useVideoState } from "../../../lib/api"
import { API_URL } from "../../../lib/config"
import { useI18n } from "../../../lib/i18n"
import { colors, radius, spacing } from "../../../theme"

/**
 * The video consultation, in three phases on one screen:
 *   prejoin → device checks + honest gating (the server decides, we render)
 *   call    → the actual consultation (Daily call object, native views)
 *   ended   → closure + way back
 * No token ever touches storage; it arrives right before `join` and dies
 * with the entry window.
 */

type Phase = "prejoin" | "joining" | "call" | "ended"
type PermCheck = "unchecked" | "checking" | "ready" | "denied"

export default function VideoConsultation() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()

  const [phase, setPhase] = useState<Phase>("prejoin")
  const state = useVideoState(id, { poll: true, enabled: phase === "prejoin" })

  const [perm, setPerm] = useState<PermCheck>("unchecked")
  const [joinError, setJoinError] = useState<string | null>(null)

  const callRef = useRef<DailyCall | null>(null)
  const roleRef = useRef<"patient" | "doctor" | "staff">("patient")
  const [remote, setRemote] = useState<DailyParticipant | null>(null)
  const [local, setLocal] = useState<DailyParticipant | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [connState, setConnState] = useState<"connected" | "interrupted">("connected")
  const [elapsed, setElapsed] = useState(0)
  const [confirmEnd, setConfirmEnd] = useState(false)

  /* ── Device checks (pre-join) ─────────────────────────────────────────── */

  const checkDevices = useCallback(async () => {
    setPerm("checking")
    try {
      // Requesting a stream prompts the OS permissions; we stop the tracks
      // immediately — the camera light must not stay on in the waiting room.
      const stream = await mediaDevices.getUserMedia({ audio: true, video: true })
      stream.getTracks().forEach((track) => track.stop())
      setPerm("ready")
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      setPerm("denied")
    }
  }, [])

  /* ── Call lifecycle ───────────────────────────────────────────────────── */

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

  // Leaving the screen mid-call must never leave camera/mic running.
  useEffect(() => {
    return () => {
      void teardown()
    }
  }, [teardown])

  const join = useCallback(async () => {
    if (callRef.current) return
    setJoinError(null)
    setPhase("joining")
    try {
      const grant = await api.videoJoin(id)
      roleRef.current = grant.role
      if (!grant.roomUrl) throw new Error(t.video.reasons.disabled)

      const call = Daily.createCallObject()
      callRef.current = call

      const refresh = () => {
        const all = call.participants()
        setLocal(all.local ?? null)
        setRemote(
          Object.values(all).find((p) => p && !p.local) ?? null,
        )
      }
      call.on("participant-joined", refresh)
      call.on("participant-updated", refresh)
      call.on("participant-left", refresh)
      call.on("left-meeting", () => {
        // Ended from the other side (or ejected at window close).
        setPhase((current) => (current === "call" ? "ended" : current))
      })
      call.on("error", () => {
        setJoinError(t.common.loadFailed)
        setPhase("prejoin")
        void teardown()
      })
      call.on("network-connection", (ev) => {
        if (ev?.event === "interrupted") {
          setConnState("interrupted")
          void api.videoEvent(id, "connection_lost")
        } else if (ev?.event === "connected") {
          setConnState("connected")
          void api.videoEvent(id, "reconnected")
        }
      })

      await call.join({ url: grant.roomUrl, token: grant.token })
      refresh()
      setPhase("call")
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      void api.videoEvent(id, "joined")
    } catch (err) {
      await teardown()
      setPhase("prejoin")
      setJoinError(
        err instanceof Error && err.message ? err.message : t.common.loadFailed,
      )
    }
  }, [id, t, teardown])

  const endCall = useCallback(async () => {
    setConfirmEnd(false)
    void api.videoEvent(id, roleRef.current === "patient" ? "left" : "ended")
    await teardown()
    setPhase("ended")
  }, [id, teardown])

  /* ── In-call controls ─────────────────────────────────────────────────── */

  const toggleMic = useCallback(() => {
    const call = callRef.current
    if (!call) return
    const next = !micOn
    call.setLocalAudio(next)
    setMicOn(next)
    void Haptics.selectionAsync()
    void api.videoEvent(id, next ? "mic_on" : "mic_off")
  }, [id, micOn])

  const toggleCam = useCallback(() => {
    const call = callRef.current
    if (!call) return
    const next = !camOn
    call.setLocalVideo(next)
    setCamOn(next)
    void Haptics.selectionAsync()
    void api.videoEvent(id, next ? "camera_on" : "camera_off")
  }, [id, camOn])

  const flipCamera = useCallback(() => {
    void callRef.current?.cycleCamera()
    void Haptics.selectionAsync()
  }, [])

  const toggleSpeaker = useCallback(() => {
    const call = callRef.current
    if (!call) return
    const next = !speakerOn
    // Best-effort: not every device exposes both routes.
    void call.setAudioDevice(next ? "speakerphone" : "earpiece").catch(() => undefined)
    setSpeakerOn(next)
    void Haptics.selectionAsync()
  }, [speakerOn])

  // Call duration ticker.
  useEffect(() => {
    if (phase !== "call") return
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [phase])

  /* ── Render ───────────────────────────────────────────────────────────── */

  if (phase === "call" || phase === "joining") {
    const remoteTrack = remote?.tracks.video.track ?? null
    const remoteAudio = remote?.tracks.audio.track ?? null
    const localTrack = local?.tracks.video.track ?? null
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0")
    const seconds = String(elapsed % 60).padStart(2, "0")

    return (
      <View style={{ flex: 1, backgroundColor: colors.ink }}>
        {/* Remote video fills the stage */}
        {remoteTrack ? (
          <DailyMediaView
            videoTrack={remoteTrack}
            audioTrack={remoteAudio}
            objectFit="cover"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { alignItems: "center", justifyContent: "center", gap: spacing.lg },
            ]}
          >
            <Avatar name={state.data?.doctorName ?? ""} size={84} />
            <ActivityIndicator color="#FFFFFF" />
            <AppText variant="sub" color="rgba(255,255,255,0.8)">
              {phase === "joining" ? t.video.connecting : t.video.waitingOther}
            </AppText>
          </View>
        )}

        {/* Local preview */}
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

        {/* Top status bar */}
        <View
          style={{
            position: "absolute",
            top: insets.top + spacing.md,
            start: spacing.md,
            gap: 4,
          }}
        >
          <AppText variant="sub" weight="bold" color="#FFFFFF">
            {state.data?.doctorName ?? ""}
          </AppText>
          {phase === "call" ? (
            <AppText variant="caption" color="rgba(255,255,255,0.75)" style={{ writingDirection: "ltr" }}>
              {minutes}:{seconds}
            </AppText>
          ) : null}
          {connState === "interrupted" ? (
            <View
              style={{
                backgroundColor: "rgba(220,80,60,0.9)",
                borderRadius: radius.full,
                paddingHorizontal: spacing.md,
                paddingVertical: 4,
              }}
            >
              <AppText variant="caption" weight="medium" color="#FFFFFF">
                {t.video.reconnecting}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Controls */}
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
            <RoundControl
              icon="call"
              danger
              label={t.video.endCall}
              onPress={() => setConfirmEnd(true)}
            />
          </View>
        ) : null}

        <BottomSheet
          visible={confirmEnd}
          onClose={() => setConfirmEnd(false)}
          title={t.video.endConfirmTitle}
          description={t.video.endConfirmBody}
        >
          <View style={{ gap: spacing.sm }}>
            <Button
              label={t.video.endCall}
              onPress={() => void endCall()}
              style={{ backgroundColor: colors.danger }}
            />
            <Button
              label={t.common.cancel}
              variant="ghost"
              onPress={() => setConfirmEnd(false)}
            />
          </View>
        </BottomSheet>
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
          gap: spacing.lg,
        }}
      >
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: colors.successSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="checkmark" size={36} color={colors.success} />
        </View>
        <AppText variant="title" weight="heavy" style={{ textAlign: "center" }}>
          {t.video.endedTitle}
        </AppText>
        <AppText
          variant="sub"
          color={colors.textMuted}
          style={{ textAlign: "center" }}
        >
          {t.video.endedBody}
        </AppText>
        <Button
          label={t.video.backToAppointment}
          onPress={() => router.back()}
          style={{ marginTop: spacing.md }}
        />
        <Pressable
          onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/contact`)}
          accessibilityRole="button"
        >
          <AppText variant="sub" weight="medium" color={colors.primary}>
            {t.appointmentDetails.contactSupport}
          </AppText>
        </Pressable>
      </View>
    )
  }

  /* ── Pre-join ─────────────────────────────────────────────────────────── */

  const s = state.data
  const starts = s ? new Date(s.startsAt) : null
  const intl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US"
  const canJoin = Boolean(s?.allowed) && perm === "ready"

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
          {t.video.preTitle}
        </AppText>
      </View>

      <View style={{ padding: spacing.screen, gap: spacing.lg }}>
        {state.isLoading ? (
          <Card style={{ gap: spacing.md }}>
            <Skeleton style={{ width: "55%" }} />
            <Skeleton style={{ width: "70%" }} />
          </Card>
        ) : !s ? (
          <Card>
            <AppText variant="sub" color={colors.textMuted}>
              {t.common.loadFailed}
            </AppText>
          </Card>
        ) : (
          <>
            {/* Who + when */}
            <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Avatar name={s.doctorName} size={52} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="bold" numberOfLines={1}>
                  {s.doctorName}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {starts?.toLocaleDateString(intl, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  ·{" "}
                  {starts?.toLocaleTimeString(intl, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </AppText>
              </View>
            </Card>

            {/* Gate status */}
            <View
              style={{
                backgroundColor: s.allowed ? colors.successSoft : colors.primarySoft,
                borderRadius: radius.md,
                padding: spacing.md,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Ionicons
                name={s.allowed ? "checkmark-circle" : "time-outline"}
                size={18}
                color={s.allowed ? colors.success : colors.primary}
              />
              <AppText
                variant="sub"
                color={s.allowed ? colors.success : colors.textMuted}
                style={{ flex: 1 }}
              >
                {s.allowed
                  ? s.counterpartJoined
                    ? t.video.counterpartWaiting
                    : t.video.cardReady
                  : (t.video.reasons[s.reason ?? ""] ?? t.common.loadFailed)}
              </AppText>
            </View>

            {/* Device checks */}
            <Card style={{ gap: spacing.md }}>
              <CheckRow
                icon="videocam-outline"
                label={t.video.cameraCheck}
                status={perm}
                readyLabel={t.video.checkReady}
                deniedLabel={t.video.checkDenied}
              />
              <CheckRow
                icon="mic-outline"
                label={t.video.micCheck}
                status={perm}
                readyLabel={t.video.checkReady}
                deniedLabel={t.video.checkDenied}
              />
              {perm !== "ready" ? (
                <Button
                  label={t.video.prepare}
                  variant="secondary"
                  loading={perm === "checking"}
                  onPress={() => void checkDevices()}
                />
              ) : null}
              {perm === "denied" ? (
                <AppText variant="caption" color={colors.danger}>
                  {t.video.permissionDenied}
                </AppText>
              ) : null}
              <Pressable
                onPress={() => router.push("/camera-test")}
                accessibilityRole="button"
                hitSlop={4}
              >
                <AppText variant="caption" weight="medium" color={colors.primary}>
                  {t.cameraTest.title}
                </AppText>
              </Pressable>
            </Card>

            {/* Tips */}
            <Card style={{ gap: spacing.sm }}>
              <AppText variant="sub" weight="bold">
                {t.video.tipsTitle}
              </AppText>
              {[t.video.tip1, t.video.tip2, t.video.tip3].map((tip) => (
                <View
                  key={tip}
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
                >
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: colors.gold,
                    }}
                  />
                  <AppText variant="caption" color={colors.textMuted}>
                    {tip}
                  </AppText>
                </View>
              ))}
            </Card>

            {joinError ? (
              <View
                style={{
                  backgroundColor: colors.dangerSoft,
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}
              >
                <AppText variant="sub" color={colors.danger}>
                  {joinError}
                </AppText>
              </View>
            ) : null}

            <Button
              label={t.video.join}
              icon="videocam"
              disabled={!canJoin}
              onPress={() => void join()}
            />

            <Pressable
              onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/contact`)}
              accessibilityRole="button"
              style={{ alignSelf: "center" }}
            >
              <AppText variant="sub" weight="medium" color={colors.primary}>
                {t.appointmentDetails.contactSupport}
              </AppText>
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

function RoundControl({
  icon,
  label,
  onPress,
  active = false,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  active?: boolean
  danger?: boolean
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
        backgroundColor: danger
          ? colors.danger
          : active
            ? "rgba(255,255,255,0.22)"
            : "rgba(255,255,255,0.10)",
        transform: [{ scale: pressed ? 0.93 : 1 }, { rotate: danger ? "135deg" : "0deg" }],
      })}
    >
      <Ionicons name={icon} size={22} color="#FFFFFF" />
    </Pressable>
  )
}

function CheckRow({
  icon,
  label,
  status,
  readyLabel,
  deniedLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  status: PermCheck
  readyLabel: string
  deniedLabel: string
}) {
  const tone =
    status === "ready" ? colors.success : status === "denied" ? colors.danger : colors.textFaint
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <AppText variant="sub" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="caption" weight="medium" color={tone}>
        {status === "ready" ? readyLabel : status === "denied" ? deniedLabel : "—"}
      </AppText>
    </View>
  )
}
