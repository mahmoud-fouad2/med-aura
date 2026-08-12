import { Pressable, View } from "react-native"
import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { useI18n } from "../../lib/i18n"
import { colors, shadows, TAB_BAR_HEIGHT } from "../../theme"

export default function TabsLayout() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        // textMuted rather than textFaint — the lightest gray read as
        // barely-there on a real screen instead of clearly "inactive."
        tabBarInactiveTintColor: colors.textMuted,
        // A fixed height replaces React Navigation's own inset-aware sizing,
        // so the device's Android nav bar (3-button or gesture pill) would
        // otherwise sit on top of — or hide — this tab bar. Adding
        // insets.bottom here is what keeps every tab reachable and tappable
        // above the system bar on every device. TAB_BAR_HEIGHT is shared
        // with every tab screen's own bottom padding so scrolled content
        // always clears the bar instead of guessing a flat spacing value.
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t.tabs.explore,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={22} color={color} />
          ),
        }}
      />
      {/* Center AI concierge — a raised, brand-gold action that stands apart
          from the flat tabs, signalling "this is the special one." */}
      <Tabs.Screen
        name="assistant"
        options={{
          title: t.tabs.assistant,
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.assistant.title}
              onPress={(e) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                props.onPress?.(e)
              }}
              style={{ flex: 1, alignItems: "center", justifyContent: "flex-start" }}
            >
              <View
                style={[
                  {
                    marginTop: -22,
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: colors.gold,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 4,
                    borderColor: colors.card,
                  },
                  shadows.raised,
                ]}
              >
                <Ionicons name="sparkles" size={26} color={colors.ink} />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: t.tabs.appointments,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
