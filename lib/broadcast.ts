export const BROADCAST_AUDIENCES = ["all", "patients", "doctors"] as const
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number]
