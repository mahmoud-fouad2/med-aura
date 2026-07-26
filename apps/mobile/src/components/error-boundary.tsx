import { Component, type ReactNode } from "react"
import { View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button } from "./ui"
import { colors, spacing, radius } from "../theme"

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Last-resort net around the whole app. Nothing upstream of this (module
 * load, the auth client, storage reads) can be caught here — only render-time
 * errors in the component tree — but that's still the difference between "a
 * screen breaks and shows a recoverable message" and "the app just closes"
 * for any error we didn't specifically guard against elsewhere.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[RootErrorBoundary] caught", error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
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
            width: 64,
            height: 64,
            borderRadius: radius.full,
            backgroundColor: colors.dangerSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
        </View>
        <AppText variant="heading" weight="bold" style={{ textAlign: "center" }}>
          حدث خطأ غير متوقع
        </AppText>
        <AppText variant="body" color={colors.textMuted} style={{ textAlign: "center" }}>
          نعتذر عن الإزعاج. يمكنك المحاولة مرة أخرى، وإذا استمرت المشكلة أغلق التطبيق وأعد فتحه.
        </AppText>
        <Button label="إعادة المحاولة" onPress={this.reset} />
      </View>
    )
  }
}
