import { useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button } from "./ui"
import { BottomSheet } from "./bottom-sheet"
import { type DoctorFilters, type FilterFacets } from "../lib/api"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

/** Price buckets are honest presets over the consultation fee (SAR). */
const PRICE_BUCKETS: {
  id: string
  min?: number
  max?: number
}[] = [
  { id: "u200", max: 200 },
  { id: "200-500", min: 200, max: 500 },
  { id: "o500", min: 500 },
]

/**
 * Doctor filter sheet. Everything is staged locally — no query runs until the
 * user taps Apply, so dragging through options never fires a request. Only
 * filters backed by real data are offered; "Nearest to me" is shown disabled
 * (arrives with the Location batch, once branches have coordinates).
 */
export function DoctorFilterSheet({
  visible,
  onClose,
  facets,
  current,
  onApply,
}: {
  visible: boolean
  onClose: () => void
  facets: FilterFacets | undefined
  current: DoctorFilters
  onApply: (next: DoctorFilters) => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<DoctorFilters>(current)
  // Re-seed the draft from the applied filters each time the sheet opens —
  // done during render (React's recommended pattern) rather than an effect.
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) setDraft(current)
  }

  const langLabel = (code: string) =>
    code === "ar"
      ? t.filters.langAr
      : code === "en"
        ? t.filters.langEn
        : code === "tr"
          ? t.filters.langTr
          : code

  const priceBucketId =
    draft.priceMin == null && draft.priceMax == null
      ? null
      : PRICE_BUCKETS.find(
          (b) => b.min === draft.priceMin && b.max === draft.priceMax,
        )?.id ?? null

  const priceBucketLabel = (b: (typeof PRICE_BUCKETS)[number]) =>
    b.min == null
      ? `${t.filters.priceUnder} ${b.max}`
      : b.max == null
        ? `${t.filters.priceOver} ${b.min}`
        : `${b.min}–${b.max}`

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t.filters.title}>
      <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg }}>
          {/* Consultation type */}
          <Section title={t.filters.consultation}>
            <Chip
              label={t.filters.video}
              active={draft.consultation === "VIDEO_CONSULTATION"}
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  consultation:
                    d.consultation === "VIDEO_CONSULTATION" ? undefined : "VIDEO_CONSULTATION",
                }))
              }
            />
            <Chip
              label={t.filters.inPerson}
              active={draft.consultation === "IN_PERSON_CONSULTATION"}
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  consultation:
                    d.consultation === "IN_PERSON_CONSULTATION" ? undefined : "IN_PERSON_CONSULTATION",
                }))
              }
            />
          </Section>

          {/* Category / specialty */}
          {facets?.categories.length ? (
            <Section title={t.filters.category}>
              {facets.categories.map((c) => (
                <Chip
                  key={c.slug}
                  label={c.nameAr}
                  active={draft.category === c.slug}
                  onPress={() =>
                    setDraft((d) => ({
                      ...d,
                      category: d.category === c.slug ? undefined : c.slug,
                    }))
                  }
                />
              ))}
            </Section>
          ) : null}

          {/* City */}
          {facets?.cities.length ? (
            <Section title={t.filters.city}>
              {facets.cities.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={draft.city === c}
                  onPress={() =>
                    setDraft((d) => ({ ...d, city: d.city === c ? undefined : c }))
                  }
                />
              ))}
            </Section>
          ) : null}

          {/* Language */}
          {facets?.languages.length ? (
            <Section title={t.filters.language}>
              {facets.languages.map((l) => (
                <Chip
                  key={l}
                  label={langLabel(l)}
                  active={draft.language === l}
                  onPress={() =>
                    setDraft((d) => ({ ...d, language: d.language === l ? undefined : l }))
                  }
                />
              ))}
            </Section>
          ) : null}

          {/* Price */}
          <Section title={t.filters.price}>
            {PRICE_BUCKETS.map((b) => (
              <Chip
                key={b.id}
                label={priceBucketLabel(b)}
                active={priceBucketId === b.id}
                onPress={() =>
                  setDraft((d) =>
                    priceBucketId === b.id
                      ? { ...d, priceMin: undefined, priceMax: undefined }
                      : { ...d, priceMin: b.min, priceMax: b.max },
                  )
                }
              />
            ))}
          </Section>

          {/* Sort */}
          <Section title={t.filters.sort}>
            <Chip
              label={t.filters.sortPriceLow}
              active={draft.sort === "price_low"}
              onPress={() =>
                setDraft((d) => ({ ...d, sort: d.sort === "price_low" ? undefined : "price_low" }))
              }
            />
            <Chip
              label={t.filters.sortPriceHigh}
              active={draft.sort === "price_high"}
              onPress={() =>
                setDraft((d) => ({ ...d, sort: d.sort === "price_high" ? undefined : "price_high" }))
              }
            />
            <Chip
              label={t.filters.sortRating}
              active={draft.sort === "rating"}
              onPress={() =>
                setDraft((d) => ({ ...d, sort: d.sort === "rating" ? undefined : "rating" }))
              }
            />
          </Section>

          {/* Nearest — deferred to the Location batch (no coordinates yet). */}
          <Section title={t.filters.nearest}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                borderRadius: radius.full,
                paddingHorizontal: spacing.md,
                paddingVertical: 7,
                backgroundColor: "#F1EFF6",
                opacity: 0.6,
              }}
            >
              <Ionicons name="location-outline" size={14} color={colors.textFaint} />
              <AppText variant="caption" weight="medium" color={colors.textFaint}>
                {t.filters.nearestSoon}
              </AppText>
            </View>
          </Section>
        </View>
      </ScrollView>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label={t.filters.clearAll}
            variant="secondary"
            onPress={() => setDraft({})}
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button
            label={t.filters.apply}
            onPress={() => {
              onApply(draft)
              onClose()
            }}
          />
        </View>
      </View>
    </BottomSheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="sub" weight="bold">
        {title}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {children}
      </View>
    </View>
  )
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primarySoft : colors.card,
      }}
    >
      <AppText
        variant="caption"
        weight={active ? "bold" : "regular"}
        color={active ? colors.primary : colors.textMuted}
      >
        {label}
      </AppText>
    </Pressable>
  )
}
