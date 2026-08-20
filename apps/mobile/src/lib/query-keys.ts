import type { ConsultationType, DoctorFilters } from "./api"

export const queryKeys = {
  home: ["home"] as const,
  appointments: ["appointments"] as const,
  case: (id: string | null) => ["case", id] as const,
  cases: ["my-cases"] as const,
  payments: ["payments"] as const,
  doctors: (query: string, filters: DoctorFilters = {}) =>
    ["doctors", query, filters] as const,
  filterFacets: ["filter-facets"] as const,
  doctor: (slug: string) => ["doctor", slug] as const,
  services: (query: string) => ["services", query] as const,
  service: (slug: string) => ["service", slug] as const,
  slots: (slug: string, type: ConsultationType) => ["slots", slug, type] as const,
  me: ["me"] as const,
  practice: ["my-practice"] as const,
  availability: ["my-availability"] as const,
  notificationPreferences: ["notification-preferences"] as const,
  notifications: ["notifications"] as const,
  favorites: ["favorites"] as const,
  tickets: ["tickets"] as const,
  ticket: (id: string) => ["ticket", id] as const,
  video: (appointmentId: string) => ["video", appointmentId] as const,
} as const
