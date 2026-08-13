import { useCallback } from "react"
import type { GestureResponderEvent } from "react-native"
import { Pressable, View } from "react-native"
import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
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
          tabBarButton: (props) => <AssistantTabButton onPress={props.onPress} />,
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

/**
 * Center AI concierge button. A raised gold disc lifted above the tab bar,
 * sitting inside a soft two-ring halo so the button reads as *the* signature
 * action instead of another flat tab. Press animates a spring scale + haptic;
 * the halo rings are static (no always-on animation to spare the battery).
 */
function AssistantTabButton({
  onPress,
}: {
  onPress?: (e: GestureResponderEvent) => void
}) {
  const { t } = useI18n()
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }))
  const onPressIn = useCallback(() => {
    scale.set(withSpring(0.92, { damping: 16, stiffness: 320 }))
  }, [scale])
  const onPressOut = useCallback(() => {
    scale.set(withSpring(1, { damping: 14, stiffness: 260 }))
  }, [scale])
  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      onPress?.(e)
    },
    [onPress],
  )

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.assistant.title}
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ flex: 1, alignItems: "center", justifyContent: "flex-start" }}
    >
      <Animated.View
        style={[{ marginTop: -26, alignItems: "center", justifyContent: "center" }, animatedStyle]}
      >
        {/* Soft outer halo — sells "premium" without any always-on animation. */}
        <View
          style={{
            position: "absolute",
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(201, 162, 75, 0.14)",
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: "rgba(201, 162, 75, 0.22)",
          }}
        />
        {/* Main disc — with a thin cream ring separating it from the tab bar. */}
        <View
          style={[
            {
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: colors.gold,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 3,
              borderColor: colors.card,
            },
            shadows.raised,
          ]}
        >
          {/* Inset ring — the subtle detail line premium products always have. */}
          <View
            style={{
              position: "absolute",
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.28)",
            }}
          />
          <Ionicons name="sparkles" size={26} color="#FFFFFF" />
        </View>
      </Animated.View>
    </Pressable>
  )
}
