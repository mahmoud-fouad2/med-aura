import { Platform } from "react-native"
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query"
import { API_URL } from "./config"
import { authClient } from "./auth-client"

/** DTOs mirroring app/api/mobile/v1 responses on the backend. */
export type Doctor = {
  id: string
  slug: string
  name: string
  title: string | null
  country: string
  city: string | null
  yearsExperience: number
  consultationFee: string | null
  currency: string
  offersVideo: boolean
  offersInPerson: boolean
  verified: boolean
  rating: string | null
  reviewCount: number
  photoUrl: string | null
  procedures: string[]
  /** Only present when the caller sent real coordinates and the doctor's
   *  center has real coordinates too — never a fabricated distance. */
  distanceKm: number | null
}

export type DoctorDetail = Doctor & {
  bio: string | null
  languages: string[]
  centerName: string | null
  centerCity: string | null
}

export type Appointment = {
  id: string
  reference: string
  type: string
  status: string
  startsAt: string
  endsAt: string
  priceAmount: string | null
  currency: string
  counterpartName: string
  counterpartPhotoUrl: string | null
  paymentStatus: string | null
}

export type HomeData = {
  firstName: string
  upcomingCount: number
  nextAppointment: Appointment | null
  featuredDoctors: Doctor[]
  /** Doctor accounts only — omitted for patients. */
  todayCount?: number
  todaysAppointments?: Appointment[]
}

export type Me = {
  id: string
  name: string
  email: string
  role: string
  accountType: "patient" | "doctor" | "staff"
  displayName: string
  doctorName: string | null
  photoUrl: string | null
  phone: string | null
  residenceCountry: string | null
  city: string | null
}

export type AppNotification = {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  readAt: string | null
  createdAt: string
}

export type VideoDenyReason =
  | "not_found"
  | "not_authorized"
  | "not_video"
  | "disabled"
  | "not_confirmed"
  | "cancelled"
  | "too_early"
  | "expired"

export type VideoState = {
  isVideoAppointment: boolean
  configured: boolean
  role: "patient" | "doctor" | "staff"
  allowed: boolean
  reason: VideoDenyReason | null
  joinAvailableFrom: string | null
  joinAvailableUntil: string | null
  startsAt: string
  endsAt: string
  doctorName: string
  counterpartJoined: boolean
  callStatus: "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED" | null
}

export type VideoJoin = {
  token: string
  expiresAt: string
  roomUrl: string | null
  role: "patient" | "doctor" | "staff"
  doctorName: string
}

export type Service = {
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  isSurgical: boolean
  recoveryDays: number | null
  categorySlug: string
  categoryNameAr: string
  doctorCount: number
  /** Same category illustration used on the web — always a real absolute URL. */
  imageUrl: string
}

export type ServiceDetail = Service & {
  nameEn: string
  descriptionEn: string | null
  doctors: {
    slug: string
    name: string
    title: string | null
    photoUrl: string | null
    verified: boolean
  }[]
}

export type DoctorFilters = {
  city?: string
  language?: string
  category?: string
  consultation?: "VIDEO_CONSULTATION" | "IN_PERSON_CONSULTATION"
  surgical?: "true" | "false"
  priceMin?: number
  priceMax?: number
  sort?: "price_low" | "price_high" | "rating" | "nearest"
  /** Only sent when the user opted into "nearest to me" and permission was granted. */
  lat?: number
  lng?: number
  radiusKm?: number
}

export type FilterFacets = {
  cities: string[]
  languages: string[]
  categories: { slug: string; nameAr: string }[]
  /** True only if at least one real branch has coordinates set — gates
   *  whether "nearest to me" can be offered as functional at all. */
  hasNearestSupport: boolean
}

export class SessionExpiredError extends Error {}

/** The request never reached the server (no connectivity, DNS, timeout). */
export class NetworkError extends Error {}

async function request<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  }
  if (init?.auth !== false) {
    const cookie = authClient.getCookie()
    if (cookie) headers.Cookie = cookie
  }
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch (cause) {
    // fetch itself rejecting means connectivity, not the server — the UI
    // must say "offline", never blame the data, and vice versa.
    throw new NetworkError("offline", { cause })
  }
  if (res.status === 401) throw new SessionExpiredError()
  const body = (await res.json().catch(() => null)) as
    | { ok: true; data: T }
    | { ok: false; error: string }
    | null
  if (!res.ok || !body || !body.ok) {
    throw new Error(
      body && "error" in body && body.error
        ? body.error
        : "تعذر تحميل البيانات. حاول مرة أخرى.",
    )
  }
  return body.data
}

export type ConsultationType = "VIDEO_CONSULTATION" | "IN_PERSON_CONSULTATION"

export type SlotsResponse = {
  doctorId: string
  consultationFee: string | null
  currency: string
  slots: { startsAt: string; endsAt: string }[]
}

export type BookingResult = {
  appointmentId: string
  paymentConfigured: boolean
  checkoutUrl?: string
}

export const api = {
  me: () => request<Me>("/api/mobile/v1/me"),
  updateMe: (input: {
    name: string
    phone: string
    residenceCountry: string
    city?: string
  }) =>
    request<{ updated: boolean }>("/api/mobile/v1/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  avatarPresign: (input: { fileName: string; contentType: string; sizeBytes: number }) =>
    request<{ uploadUrl: string; objectKey: string }>("/api/mobile/v1/me/avatar", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  avatarFinalize: (objectKey: string) =>
    request<{ photoUrl: string | null }>("/api/mobile/v1/me/avatar", {
      method: "PUT",
      body: JSON.stringify({ objectKey }),
    }),
  avatarRemove: () =>
    request<{ removed: boolean }>("/api/mobile/v1/me/avatar", { method: "DELETE" }),
  registerPushToken: (input: { token: string; platform: "android" | "ios" }) =>
    request<{ registered: boolean }>("/api/mobile/v1/push-tokens", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  unregisterPushToken: (token: string) =>
    request<{ removed: boolean }>("/api/mobile/v1/push-tokens", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    }),
  notifications: () =>
    request<{ unread: number; notifications: AppNotification[] }>(
      "/api/mobile/v1/notifications",
    ),
  markNotificationsRead: (input: { id: string } | { all: true }) =>
    request<{ updated: boolean }>("/api/mobile/v1/notifications", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  home: () => request<HomeData>("/api/mobile/v1/home"),
  appointments: () =>
    request<{ appointments: Appointment[] }>("/api/mobile/v1/appointments"),
  videoState: (appointmentId: string) =>
    request<VideoState>(`/api/mobile/v1/appointments/${appointmentId}/video`),
  videoJoin: async (appointmentId: string): Promise<VideoJoin> => {
    // The session must exist before a token can reference its room.
    await request(`/api/mobile/v1/appointments/${appointmentId}/video/session`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    return request<VideoJoin>(
      `/api/mobile/v1/appointments/${appointmentId}/video/token`,
      { method: "POST", body: JSON.stringify({}) },
    )
  },
  videoEvent: (appointmentId: string, event: string) =>
    request<{ recorded: boolean }>(
      `/api/mobile/v1/appointments/${appointmentId}/video/events`,
      {
        method: "POST",
        body: JSON.stringify({
          event,
          deviceType: Platform.OS === "ios" ? "ios" : "android",
        }),
      },
      // Telemetry is best-effort — a failed event must never break the call.
    ).catch(() => ({ recorded: false })),
  /** QA-only: logs join/leave events for a video-QA test room (404s when the
   *  server-side ENABLE_VIDEO_QA_TOOLS flag is off). Best-effort, same as
   *  the real videoEvent above. */
  qaVideoEvent: (
    roomName: string,
    event: "patient_joined" | "doctor_joined" | "patient_left" | "doctor_left",
  ) =>
    request<{ ok: boolean }>("/api/dev/video-qa/events", {
      method: "POST",
      body: JSON.stringify({ roomName, event }),
    }).catch(() => ({ ok: false })),
  doctors: (params: { q?: string; page?: number; filters?: DoctorFilters }) => {
    const sp = new URLSearchParams()
    if (params.q) sp.set("q", params.q)
    if (params.page) sp.set("page", String(params.page))
    const f = params.filters
    if (f?.city) sp.set("city", f.city)
    if (f?.language) sp.set("language", f.language)
    if (f?.category) sp.set("category", f.category)
    if (f?.consultation) sp.set("consultation", f.consultation)
    if (f?.surgical) sp.set("surgical", f.surgical)
    if (f?.priceMin != null) sp.set("priceMin", String(f.priceMin))
    if (f?.priceMax != null) sp.set("priceMax", String(f.priceMax))
    if (f?.sort) sp.set("sort", f.sort)
    if (f?.lat != null) sp.set("lat", String(f.lat))
    if (f?.lng != null) sp.set("lng", String(f.lng))
    if (f?.radiusKm != null) sp.set("radiusKm", String(f.radiusKm))
    return request<{ total: number; page: number; doctors: Doctor[] }>(
      `/api/mobile/v1/doctors?${sp.toString()}`,
      { auth: false },
    )
  },
  filterFacets: () =>
    request<FilterFacets>("/api/mobile/v1/filters", { auth: false }),
  doctor: (slug: string) =>
    request<DoctorDetail>(`/api/mobile/v1/doctors/${slug}`, { auth: false }),
  services: (params: { q?: string }) => {
    const sp = new URLSearchParams()
    if (params.q) sp.set("q", params.q)
    return request<{ services: Service[] }>(
      `/api/mobile/v1/services?${sp.toString()}`,
      { auth: false },
    )
  },
  service: (slug: string) =>
    request<ServiceDetail>(`/api/mobile/v1/services/${slug}`, { auth: false }),
  slots: (slug: string, type: ConsultationType) =>
    request<SlotsResponse>(
      `/api/mobile/v1/doctors/${slug}/slots?type=${type}`,
      { auth: false },
    ),
  book: (input: { doctorId: string; startsAt: string; type: ConsultationType }) =>
    request<BookingResult>("/api/mobile/v1/bookings", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  completeSignupProfile: (input: {
    accountType: "patient" | "doctor"
    phone: string
    residenceCountry: string
    city?: string
  }) =>
    request<{ next: string }>("/api/mobile/v1/signup-profile", {
      method: "POST",
      body: JSON.stringify(input),
    }),
}

export const useHome = () =>
  useQuery({ queryKey: ["home"], queryFn: api.home, staleTime: 30_000 })

export const useAppointments = () =>
  useQuery({
    queryKey: ["appointments"],
    queryFn: api.appointments,
    staleTime: 30_000,
  })

export const useDoctors = (q: string, filters?: DoctorFilters) =>
  useInfiniteQuery({
    queryKey: ["doctors", q, filters ?? {}],
    queryFn: ({ pageParam }) =>
      api.doctors({ q: q || undefined, page: pageParam, filters }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.reduce((n, p) => n + p.doctors.length, 0) < last.total
        ? last.page + 1
        : undefined,
    // While a new search term/filter loads, the previous results stay on
    // screen — no skeleton flash between keystrokes or filter changes.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

export const useFilterFacets = () =>
  useQuery({
    queryKey: ["filter-facets"],
    queryFn: api.filterFacets,
    staleTime: 5 * 60_000,
  })

export const useDoctor = (slug: string) =>
  useQuery({
    queryKey: ["doctor", slug],
    queryFn: () => api.doctor(slug),
    staleTime: 60_000,
  })

export const useServices = (q: string) =>
  useQuery({
    queryKey: ["services", q],
    queryFn: () => api.services({ q: q || undefined }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

export const useService = (slug: string) =>
  useQuery({
    queryKey: ["service", slug],
    queryFn: () => api.service(slug),
    staleTime: 60_000,
  })

export const useSlots = (slug: string, type: ConsultationType) =>
  useQuery({
    queryKey: ["slots", slug, type],
    queryFn: () => api.slots(slug, type),
    // Availability is time-sensitive; keep it fresh.
    staleTime: 15_000,
  })

export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: api.me, staleTime: 60_000 })

export const useNotifications = () =>
  useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications,
    staleTime: 30_000,
  })

export const useVideoState = (appointmentId: string, opts?: { poll?: boolean; enabled?: boolean }) =>
  useQuery({
    queryKey: ["video", appointmentId],
    queryFn: () => api.videoState(appointmentId),
    staleTime: 15_000,
    // The pre-join screen polls so the join button appears the moment the
    // window opens (and "طبيبك في غرفة الانتظار" the moment they arrive).
    refetchInterval: opts?.poll ? 20_000 : false,
    enabled: opts?.enabled ?? true,
  })
