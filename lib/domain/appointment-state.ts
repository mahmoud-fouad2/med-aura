const NO_SHOW_SOURCE_STATUSES = new Set(["CONFIRMED", "RESCHEDULED"])

export function canMarkAppointmentNoShow(input: {
  status: string
  endsAt: Date
  now?: Date
}): boolean {
  return (
    NO_SHOW_SOURCE_STATUSES.has(input.status) &&
    input.endsAt.getTime() <= (input.now ?? new Date()).getTime()
  )
}

export function canRescheduleMissedAppointment(status: string): boolean {
  return status === "NO_SHOW"
}

const CANCELLABLE_STATUSES = new Set([
  "PENDING_PAYMENT",
  "PENDING_PROVIDER_CONFIRMATION",
  "CONFIRMED",
  "RESCHEDULED",
])

export function canCancelAppointment(input: {
  status: string
  startsAt: Date
  now?: Date
}): boolean {
  return (
    CANCELLABLE_STATUSES.has(input.status) &&
    input.startsAt.getTime() > (input.now ?? new Date()).getTime()
  )
}