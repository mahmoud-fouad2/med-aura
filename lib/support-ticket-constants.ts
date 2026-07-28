/** No DB import here — safe for client components (lib/data/support-tickets.ts pulls in pg via lib/db). */

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_CATEGORIES = ["ACCOUNT", "BOOKING", "BILLING", "MEDICAL", "TECHNICAL", "OTHER"] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]
