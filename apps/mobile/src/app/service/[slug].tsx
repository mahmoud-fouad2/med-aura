import { ScrollView, Pressable, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Avatar,
  Button,
  Card,
  ChevronBack,
  ChevronForward,
  Skeleton,
} from "../../components/ui"
import { onboardingArt } from "../../components/brand"
import { QueryErrorState } from "../../components/query-error"
import { useMe, useService } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"

export default function ServiceDetails() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const me = useMe()
  const service = useService(slug)
  const isPatient = (me.data?.accountType ?? "patient") === "patient"

  const art = [
    onboardingArt.trust,
    onboardingArt.consult,
    onboardingArt.journey,
    onboardingArt.privacy,
  ][(slug?.length ?? 0) % 4]

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View
          style={{
            paddingTop: insets.top + spacing.md,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.screen,
            backgroundColor: colors.primary,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            overflow: "hidden",
          }}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            hitSlop={8}
            style={{ marginBottom: spacing.md }}
          >
            <ChevronBack size={24} color="#FFFFFF" />
          </Pressable>
          <View style={{ alignItems: "center", gap: spacing.sm }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: radius.xl,
                backgroundColor: "rgba(255,255,255,0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image source={art} style={{ width: 76, height: 76 }} contentFit="contain" />
            </View>
            {service.data ? (
              <AppText variant="title" weight="heavy" color="#FFFFFF" style={{ textAlign: "center" }}>
                {service.data.nameAr}
              </AppText>
            ) : (
              <Skeleton style={{ width: 160, height: 24, backgroundColor: "rgba(255,255,255,0.25)" }} />
            )}
          </View>
        </View>

        <View style={{ padding: spacing.screen, gap: spacing.lg }}>
          {service.isLoading ? (
            <Card style={{ gap: spacing.md }}>
              <Skeleton style={{ width: "60%" }} />
              <Skeleton style={{ width: "90%" }} />
              <Skeleton style={{ width: "80%" }} />
            </Card>
          ) : service.isError || !service.data ? (
            <QueryErrorState error={service.error} onRetry={() => void service.refetch()} />
          ) : (
            <>
              {/* Meta chips */}
              <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                <MetaChip
                  icon="pricetag-outline"
                  label={t.services.priceAfterConsult}
                />
                {service.data.recoveryDays != null ? (
                  <MetaChip
                    icon="time-outline"
                    label={`${t.services.recovery}: ${service.data.recoveryDays} ${t.services.recoveryDays}`}
                  />
                ) : null}
                <MetaChip
                  icon={service.data.isSurgical ? "medkit-outline" : "leaf-outline"}
                  label={service.data.isSurgical ? t.services.surgical : t.services.nonSurgical}
                />
              </View>

              {/* About */}
              {service.data.descriptionAr ? (
                <Card style={{ gap: spacing.sm }}>
                  <AppText variant="sub" weight="bold">
                    {t.services.aboutService}
                  </AppText>
                  <AppText variant="sub" color={colors.textMuted}>
                    {service.data.descriptionAr}
                  </AppText>
                </Card>
              ) : null}

              {/* What to expect */}
              <Card style={{ gap: spacing.sm }}>
                <AppText variant="sub" weight="bold">
                  {t.services.whatToExpect}
                </AppText>
                <AppText variant="sub" color={colors.textMuted}>
                  {t.services.whatToExpectBody}
                </AppText>
              </Card>

              {/* Doctors offering it */}
              <View style={{ gap: spacing.md }}>
                <AppText variant="heading" weight="bold">
                  {t.services.providersTitle}
                </AppText>
                {service.data.doctors.length === 0 ? (
                  <Card>
                    <AppText variant="sub" color={colors.textMuted}>
                      {t.services.noProviders}
                    </AppText>
                  </Card>
                ) : (
                  service.data.doctors.map((d) => (
                    <Card
                      key={d.slug}
                      onPress={() => router.push(`/doctor/${d.slug}`)}
                      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
                    >
                      <Avatar name={d.name} photoUrl={d.photoUrl} size={52} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <AppText variant="body" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                            {d.name}
                          </AppText>
                          {d.verified ? (
                            <Ionicons name="shield-checkmark" size={14} color={colors.gold} />
                          ) : null}
                        </View>
                        {d.title ? (
                          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                            {d.title}
                          </AppText>
                        ) : null}
                      </View>
                      <ChevronForward size={18} />
                    </Card>
                  ))
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky booking CTA — patients only */}
      {isPatient && service.data ? (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: spacing.screen,
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Button
            label={t.services.book}
            icon="calendar-outline"
            onPress={() => router.push("/(tabs)/explore")}
          />
        </View>
      ) : null}
    </View>
  )
}

function MetaChip({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: colors.primarySoft,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
      }}
    >
      <Ionicons name={icon} size={14} color={colors.primary} />
      <AppText variant="caption" weight="medium" color={colors.primary}>
        {label}
      </AppText>
    </View>
  )
}
