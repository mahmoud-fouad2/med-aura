import { Pressable, ScrollView, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  Skeleton,
} from "../../components/ui"
import { useDoctor } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"

export default function DoctorProfile() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const doctor = useDoctor(slug)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Brand header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.xxl + 30,
          paddingHorizontal: spacing.screen,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "rgba(255,255,255,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: -60 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingBottom: insets.bottom + 110,
          gap: spacing.lg,
        }}
      >
        {doctor.isLoading ? (
          <Card style={{ alignItems: "center", gap: spacing.md }}>
            <Skeleton style={{ width: 88, height: 88, borderRadius: 44 }} />
            <Skeleton style={{ width: "55%" }} />
            <Skeleton style={{ width: "40%" }} />
          </Card>
        ) : doctor.isError || !doctor.data ? (
          <Card>
            <EmptyState
              icon="cloud-offline-outline"
              title={t.common.loadFailed}
              action={
                <Button
                  label={t.common.retry}
                  variant="secondary"
                  onPress={() => void doctor.refetch()}
                />
              }
            />
          </Card>
        ) : (
          <>
            <Card style={{ alignItems: "center", gap: spacing.sm }}>
              <Avatar name={doctor.data.name} photoUrl={doctor.data.photoUrl} size={88} />
              <View style={{ alignItems: "center", gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <AppText variant="heading" weight="heavy">
                    {doctor.data.name}
                  </AppText>
                  {doctor.data.verified && (
                    <Ionicons name="shield-checkmark" size={17} color={colors.gold} />
                  )}
                </View>
                {doctor.data.title ? (
                  <AppText variant="sub" color={colors.textMuted}>
                    {doctor.data.title}
                  </AppText>
                ) : null}
                <AppText variant="caption" color={colors.textFaint}>
                  {[doctor.data.city, t.countries[doctor.data.country] ?? doctor.data.country]
                    .filter(Boolean)
                    .join("، ")}
                </AppText>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingTop: spacing.md,
                  marginTop: spacing.xs,
                }}
              >
                <Stat
                  label={t.doctor.experience}
                  value={`${doctor.data.yearsExperience}`}
                  suffix={t.explore.years}
                />
                <Stat
                  label={t.doctor.rating}
                  value={doctor.data.rating ?? "—"}
                  suffix={doctor.data.reviewCount ? `(${doctor.data.reviewCount})` : ""}
                  gold
                />
                <Stat
                  label={t.doctor.fee}
                  value={doctor.data.consultationFee ?? "—"}
                  suffix={doctor.data.consultationFee ? doctor.data.currency : ""}
                />
              </View>
            </Card>

            {doctor.data.bio ? (
              <Section title={t.doctor.about}>
                <AppText variant="sub" color={colors.textMuted}>
                  {doctor.data.bio}
                </AppText>
              </Section>
            ) : null}

            {doctor.data.procedures.length ? (
              <Section title={t.doctor.procedures}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {doctor.data.procedures.map((p) => (
                    <View
                      key={p}
                      style={{
                        backgroundColor: colors.primarySoft,
                        borderRadius: radius.full,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 5,
                      }}
                    >
                      <AppText variant="caption" weight="medium" color={colors.primary}>
                        {p}
                      </AppText>
                    </View>
                  ))}
                </View>
              </Section>
            ) : null}

            {doctor.data.centerName ? (
              <Section title={t.doctor.center}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Ionicons name="business-outline" size={18} color={colors.primary} />
                  <AppText variant="sub">{doctor.data.centerName}</AppText>
                </View>
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Sticky booking CTA — completes on the secure booking flow */}
      {doctor.data ? (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: spacing.screen,
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 6,
          }}
        >
          <Button
            label={t.doctor.book}
            icon="calendar"
            onPress={() => router.push(`/booking/${doctor.data!.slug}`)}
          />
          <AppText variant="caption" color={colors.textFaint} style={{ textAlign: "center" }}>
            {t.doctor.bookNote}
          </AppText>
        </View>
      ) : null}
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <AppText variant="sub" weight="bold">
        {title}
      </AppText>
      {children}
    </Card>
  )
}

function Stat({
  label,
  value,
  suffix,
  gold,
}: {
  label: string
  value: string
  suffix?: string
  gold?: boolean
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <AppText variant="body" weight="heavy" color={gold ? colors.gold : colors.primary}>
        {value}
        {suffix ? <AppText variant="caption" color={colors.textFaint}> {suffix}</AppText> : null}
      </AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  )
}
