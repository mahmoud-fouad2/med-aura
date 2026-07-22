import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useI18n } from "../../lib/i18n"
import { colors } from "../../theme"

export default function TabsLayout() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        // A fixed height replaces React Navigation's own inset-aware sizing,
        // so the device's Android nav bar (3-button or gesture pill) would
        // otherwise sit on top of — or hide — this tab bar. Adding
        // insets.bottom here is what keeps every tab reachable and tappable
        // above the system bar on every device.
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
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
