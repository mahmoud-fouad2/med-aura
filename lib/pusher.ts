import Pusher from "pusher"
import { logger } from "@/lib/logger"

let pusherServer: Pusher | null = null

export function getPusherServer() {
  if (pusherServer) return pusherServer

  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.NEXT_PUBLIC_PUSHER_KEY ||
    !process.env.PUSHER_SECRET ||
    !process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  ) {
    logger.warn("Pusher is not configured; real-time updates are disabled")
    return null
  }

  pusherServer = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
  })

  return pusherServer
}
