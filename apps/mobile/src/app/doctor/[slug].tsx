import { I18nManager, Pressable, ScrollView, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Avatar,
  Button,
  Card,
  ChevronBack,
  IconBadge,
  Skeleton,
} from "../../components/ui"
import { QueryErrorState } from "../../components/query-error"
import { useDoctor } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"

export default function DoctorProfile() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const doctor = useDoctor(slug)
  const credentialGroups: { label: string; items: string[] }[] = doctor.data
    ? [
        { label: t.doctor.qualifications, items: doctor.data.qualifications },
        { label: t.doctor.certifications, items: doctor.data.certifications },
        { label: t.doctor.fellowships, items: doctor.data.fellowships },
        { label: t.doctor.memberships, items: doctor.data.memberships },
      ]
    : []

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Brand header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.xxl + 38,
          paddingHorizontal: spacing.screen,
          borderBottomLeftRadius: 34,
          borderBottomRightRadius: 34,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "rgba(255,255,255,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronBack size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: -72 }}
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
            <QueryErrorState error={doctor.error} onRetry={() => void doctor.refetch()} />
          </Card>
        ) : (
          <>
            <Card style={{ gap: spacing.lg }}>
              <View style={{ alignItems: "center", gap: spacing.md }}>
                <Avatar name={doctor.data.name} photoUrl={doctor.data.photoUrl} size={92} />
                <View style={{ alignItems: "center", gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <AppText variant="heading" weight="heavy" style={{ textAlign: "center" }}>
                      {doctor.data.name}
                    </AppText>
                    {doctor.data.verified && (
                      <Ionicons name="shield-checkmark" size={17} color={colors.gold} />
                    )}
                  </View>
                  {doctor.data.title ? (
                    <AppText variant="sub" color={colors.textMuted} style={{ textAlign: "center" }}>
                      {doctor.data.title}
                    </AppText>
                  ) : null}
                  <AppText variant="caption" color={colors.textFaint} style={{ textAlign: "center" }}>
                    {[doctor.data.city, t.countries[doctor.data.country] ?? doctor.data.country]
                      .filter(Boolean)
                      .join("، ")}
                  </AppText>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm }}>
                  {doctor.data.verified ? (
                    <MetaChip icon="shield-checkmark-outline" label={t.explore.verified} tone="gold" />
                  ) : null}
                  {doctor.data.offersVideo ? (
                    <MetaChip icon="videocam-outline" label={t.booking.typeVideo} />
                  ) : null}
                  {doctor.data.offersInPerson ? (
                    <MetaChip icon="business-outline" label={t.booking.typeInPerson} />
                  ) : null}
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingTop: spacing.md,
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
              <Section title={t.doctor.about} icon="sparkles-outline">
                <AppText variant="sub" color={colors.textMuted}>
                  {doctor.data.bio}
                </AppText>
              </Section>
            ) : null}

            {doctor.data.languages.length ? (
              <Section title={t.doctor.languages} icon="language-outline">
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {doctor.data.languages.map((lang) => (
                    <Tag key={lang} label={languageLabel(lang, t)} />
                  ))}
                </View>
              </Section>
            ) : null}

            {credentialGroups.some(({ items }) => items.length > 0) ? (
              <Section title={t.doctor.professionalProfile} icon="school-outline">
                <View style={{ gap: spacing.lg }}>
                  {credentialGroups.map(({ label, items }) =>
                    items.length > 0 ? (
                      <CredentialGroup key={label} label={label} items={items} />
                    ) : null,
                  )}
                </View>
              </Section>
            ) : null}

            {doctor.data.procedures.length ? (
              <Section title={t.doctor.procedures} icon="medkit-outline">
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {doctor.data.procedures.map((p) => (
                    <Tag key={p} label={p} />
                  ))}
                </View>
              </Section>
            ) : null}

            <Section title={locale === "ar" ? "طريقة الاستشارة" : "Consultation modes"} icon="videocam-outline">
              <View style={{ gap: spacing.md }}>
                {doctor.data.offersVideo ? (
                  <InfoRow
                    icon="videocam-outline"
                    title={t.booking.typeVideo}
                    subtitle={locale === "ar" ? "مناسبة للمتابعة من أي مدينة" : "Good for follow-up from anywhere"}
                  />
                ) : null}
                {doctor.data.offersInPerson ? (
                  <InfoRow
                    icon="business-outline"
                    title={t.booking.typeInPerson}
                    subtitle={locale === "ar" ? "ضمن المركز أو العيادة المعتمدة" : "Inside the approved clinic or center"}
                  />
                ) : null}
              </View>
            </Section>

            {(doctor.data.licenseAuthority || doctor.data.lastVerifiedAt || doctor.data.licenseLast4) ? (
              <Section title={locale === "ar" ? "الثقة والتحقق" : "Trust & verification"} icon="shield-checkmark-outline">
                <View style={{ gap: spacing.md }}>
                  {doctor.data.licenseAuthority ? (
                    <InfoRow
                      icon="shield-checkmark-outline"
                      title={doctor.data.licenseAuthority}
                      subtitle={
                        doctor.data.licenseLast4
                          ? locale === "ar"
                            ? `آخر 4 أرقام من الترخيص: ${doctor.data.licenseLast4}`
                            : `License ending in ${doctor.data.licenseLast4}`
                          : locale === "ar"
                            ? "الترخيص ظاهر ضمن التحقق العام"
                            : "License verified on platform"
                      }
                    />
                  ) : null}
                  {doctor.data.lastVerifiedAt ? (
                    <InfoRow
                      icon="time-outline"
                      title={locale === "ar" ? "آخر تحقق" : "Last verified"}
                      subtitle={new Date(doctor.data.lastVerifiedAt).toLocaleDateString(
                        locale === "ar" ? "ar-SA-u-nu-latn" : "en-US",
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                    />
                  ) : null}
                </View>
              </Section>
            ) : null}

            {doctor.data.centerName ? (
              <Section title={t.doctor.center} icon="business-outline">
                <InfoRow
                  icon="location-outline"
                  title={doctor.data.centerName}
                  subtitle={doctor.data.centerCity ?? (doctor.data.city ?? "")}
                />
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

function languageLabel(code: string, t: ReturnType<typeof useI18n>["t"]) {
  if (code === "ar") return t.filters.langAr
  if (code === "en") return t.filters.langEn
  if (code === "tr") return t.filters.langTr
  return code
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  children: React.ReactNode
}) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: I18nManager.isRTL ? "row-reverse" : "row", alignItems: "center", gap: spacing.sm }}>
        <IconBadge icon={icon} size={34} />
        <AppText variant="sub" weight="bold">
          {title}
        </AppText>
      </View>
      {children}
    </Card>
  )
}

function Tag({ label, tone = "primary" }: { label: string; tone?: "primary" | "gold" }) {
  const backgroundColor = tone === "gold" ? colors.goldSoft : colors.primarySoft
  const color = tone === "gold" ? colors.gold : colors.primary
  return (
    <View
      style={{
        backgroundColor,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
      }}
    >
      <AppText variant="caption" weight="medium" color={color}>
        {label}
      </AppText>
    </View>
  )
}

function MetaChip({
  icon,
  label,
  tone = "primary",
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  tone?: "primary" | "gold"
}) {
  return (
    <View
      style={{
        flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
        alignItems: "center",
        gap: 6,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 7,
        backgroundColor: tone === "gold" ? colors.goldSoft : colors.primarySoft,
      }}
    >
      <Ionicons name={icon} size={14} color={tone === "gold" ? colors.gold : colors.primary} />
      <AppText variant="caption" weight="bold" color={tone === "gold" ? colors.gold : colors.primary}>
        {label}
      </AppText>
    </View>
  )
}

function InfoRow({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle?: string
}) {
  return (
    <View style={{ flexDirection: I18nManager.isRTL ? "row-reverse" : "row", alignItems: "flex-start", gap: spacing.sm }}>
      <IconBadge icon={icon} size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" weight="bold">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  )
}

function CredentialGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="caption" weight="bold" color={colors.textMuted}>
        {label}
      </AppText>
      <View style={{ gap: spacing.xs }}>
        {items.map((item) => (
          <View
            key={item}
            style={{
              flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
              alignItems: "flex-start",
              gap: spacing.sm,
            }}
          >
            <Ionicons name="checkmark-circle" size={17} color={colors.success} />
            <AppText variant="sub" color={colors.textMuted} style={{ flex: 1 }}>
              {item}
            </AppText>
          </View>
        ))}
      </View>
    </View>
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
