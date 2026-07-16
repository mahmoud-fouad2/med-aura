import { Button, EmptyState } from "./ui"
import { stateArt } from "./brand"
import { NetworkError } from "../lib/api"
import { useI18n } from "../lib/i18n"

/**
 * One honest failure state for every query on screen. "Offline" (art + copy)
 * is shown only when the request genuinely never reached the server —
 * a server-side failure must not blame the user's connection.
 */
export function QueryErrorState({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  const { t } = useI18n()
  const offline = error instanceof NetworkError
  return (
    <EmptyState
      icon={offline ? "cloud-offline-outline" : "alert-circle-outline"}
      art={offline ? stateArt.offline : undefined}
      title={offline ? t.common.offline : t.common.loadFailed}
      body={offline ? t.common.offlineBody : undefined}
      action={
        <Button label={t.common.retry} variant="secondary" onPress={onRetry} />
      }
    />
  )
}
