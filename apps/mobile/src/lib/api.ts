import { Linking, Platform } from "react-native"
import * as Sharing from "expo-sharing"
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { API_URL } from "./config"
import { authClient } from "./auth-client"
import { downloadToCache } from "./file-transfer"
import { queryKeys } from "./query-keys"
import {
  ApiError,
  NetworkError,
  SessionExpiredError,
  TimeoutError,
} from "./request-errors"

export { streamAssistant } from "./assistant-stream"
export type {
  AssistantDoctor,
  AssistantResponse,
  AssistantStage,
  AssistantTurn,
} from "./assistant-stream"

export {
  ApiError,
  NetworkError,
  RateLimitedError,
  SessionExpiredError,
  TimeoutError,
} from "./request-errors"

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

export type DoctorGalleryItem = {
  id: string
  titleAr: string
  procedureNameAr: string
  beforeUrl: string | null
  afterUrl: string | null
}

export type DoctorReview = {
  id: string
  rating: number
  comment: string
  authorName: string | null
  anonymous: boolean
  providerResponse: string | null
  createdAt: string
}

export type DoctorDetail = Doctor & {
  bio: string | null
  languages: string[]
  qualifications: string[]
  certifications: string[]
  fellowships: string[]
  memberships: string[]
  centerName: string | null
  centerCity: string | null
  licenseAuthority: string | null
  licenseLast4: string | null
  lastVerifiedAt: string | null
  gallery: DoctorGalleryItem[]
  reviews: DoctorReview[]
}

export type FavoriteDoctor = {
  id: string
  slug: string
  name: string
  title: string | null
  city: string | null
  country: string
  photoUrl: string | null
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
  doctorSlug: string | null
  canMarkNoShow: boolean
  paymentStatus: string | null
  paymentId: string | null
  /** The linked medical case, when there is one — a doctor's entry point
   *  into the patient summary screen. */
  caseId: string | null
}

export type CaseDocument = {
  id: string
  fileName: string
  kind: string
  contentType: string
  createdAt: string
}

export type Payment = {
  paymentId: string
  reference: string
  purpose: string
  status: string
  amount: string
  currency: string
  provider: string
  paidAt: string | null
  createdAt: string
  appointmentId: string | null
  appointmentReference: string | null
  appointmentType: string | null
  doctorName: string | null
  centerName: string | null
  serviceNameEn: string | null
  serviceNameAr: string | null
}

export type CaseSummary = {
  id: string
  reference: string
  status: string
  goal: string | null
  description: string | null
  procedureName: string
  patientName: string
  centerName: string | null
  doctorName: string | null
  consentActive: boolean
  isOwner: boolean
  documents: CaseDocument[]
}

export type DoctorCaseItem = {
  id: string
  reference: string
  status: string
  procedureName: string
  patientName: string
  consentActive: boolean
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
  dateOfBirth: string | null
  nationality: string | null
  biologicalSex: "male" | "female" | null
  heightCm: number | null
  weightKg: number | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  /** False right after a Google sign-up — it never collects phone/country. */
  profileCompleted: boolean
  /** False until the "tell us about yourself" wizard step has been shown
   *  once (submitted or explicitly skipped) — independent of profileCompleted. */
  profileWizardCompleted: boolean
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

export type PracticeProcedure = {
  id: string
  nameAr: string
  nameEn: string
  categoryNameAr: string
  categoryNameEn: string
  assigned: boolean
  priceFrom: string | null
}

export type MyPractice = {
  bio: string | null
  qualifications: string[]
  certifications: string[]
  fellowships: string[]
  memberships: string[]
  consultationFee: string | null
  currency: string
  offersVideo: boolean
  offersInPerson: boolean
  published: boolean
  status: string
  timezone: string
  procedures: PracticeProcedure[]
}

export type AvailabilityRule = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotMinutes: number
  type: string
  active: boolean
}

export type TicketCategory = "ACCOUNT" | "BOOKING" | "BILLING" | "MEDICAL" | "TECHNICAL" | "OTHER"

export type TicketSummary = {
  id: string
  subject: string
  status: string
  category: string | null
  lastMessageAt: string
  unreadForMe: boolean
  createdAt: string
}

export type TicketMessage = {
  id: string
  senderName: string
  body: string
  createdAt: string
  /** Computed server-side against the signed-in viewer — never re-derive
   *  this client-side against a possibly-stale useMe() id. */
  mine: boolean
}

export type TicketDetail = {
  id: string
  subject: string
  status: string
  category: string | null
  createdAt: string
  messages: TicketMessage[]
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

export type QaVideoGrant = {
  token: string
  expiresAt: string
  roomUrl: string
  roomName: string
  role: "patient" | "doctor"
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

const REQUEST_TIMEOUT_MS = 15_000

async function request<T>(
  path: string,
  init?: RequestInit & { auth?: boolean; timeoutMs?: number },
): Promise<T> {
  const isRead = !init?.method || init.method.toUpperCase() === "GET"
  const maxAttempts = isRead ? 2 : 1

  let lastError: unknown = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const headers: Record<string, string> = {
      ...(init?.body != null ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers as Record<string, string>),
    }
    if (init?.auth !== false && Platform.OS !== "web") {
      const cookie = authClient.getCookie()
      if (cookie) headers.Cookie = cookie
    }
    const abortController = new AbortController()
    const timeout = setTimeout(
      () => abortController.abort(),
      init?.timeoutMs ?? REQUEST_TIMEOUT_MS,
    )
    let res: Response
    try {
      res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers,
        signal: init?.signal ?? abortController.signal,
        ...(Platform.OS === "web" ? { credentials: "include" } : {}),
      })
    } catch (cause) {
      if ((cause as { name?: string } | null)?.name === "AbortError") {
        lastError = new TimeoutError("timeout", { cause })
      } else {
        lastError = new NetworkError("offline", { cause })
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 400 * attempt))
        continue
      }
      throw lastError
    } finally {
      clearTimeout(timeout)
    }
    if (res.status === 401) throw new SessionExpiredError()
    const body = (await res.json().catch(() => null)) as
      | { ok: true; data: T }
      | { ok: false; error: string; code?: string }
      | null
    if (!res.ok || !body || !body.ok) {
      throw new ApiError(
        body && "error" in body && body.error ? body.error : "Request failed",
        res.status,
        body && "code" in body ? body.code : undefined,
      )
    }
    return body.data
  }
  throw lastError ?? new NetworkError("offline")
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
    dateOfBirth?: string
    nationality?: string
    biologicalSex?: "male" | "female"
    heightCm?: number
    weightKg?: number
    emergencyContactName?: string
    emergencyContactPhone?: string
  }) =>
    request<{ updated: boolean }>("/api/mobile/v1/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  favorites: () => request<{ doctors: FavoriteDoctor[] }>("/api/mobile/v1/favorites"),
  security: () =>
    request<{ enabled: boolean; totpVerified: boolean; otpAvailable: boolean }>(
      "/api/mobile/v1/security",
    ),
  toggleFavorite: (kind: "doctor" | "center" | "procedure", refId: string) =>
    request<{ favorited: boolean }>("/api/mobile/v1/favorites/toggle", {
      method: "POST",
      body: JSON.stringify({ kind, refId }),
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
  notificationPreferences: () =>
    request<{ offersEnabled: boolean }>("/api/mobile/v1/me/notification-preferences"),
  updateOffersPreference: (offersEnabled: boolean) =>
    request<{ updated: boolean }>("/api/mobile/v1/me/notification-preferences", {
      method: "PATCH",
      body: JSON.stringify({ offersEnabled }),
    }),
  myPractice: () => request<MyPractice>("/api/mobile/v1/me/practice"),
  updateMyPractice: (input: {
    consultationFee?: number
    currency: string
    offersVideo: boolean
    offersInPerson: boolean
    bio?: string
    qualifications?: string[]
    certifications?: string[]
    fellowships?: string[]
    memberships?: string[]
    timezone?: string
  }) =>
    request<{ updated: boolean }>("/api/mobile/v1/me/practice", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  toggleMyProcedure: (input: { procedureId: string; assign: boolean }) =>
    request<{ updated: boolean }>("/api/mobile/v1/me/practice/procedures", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  myAvailability: () => request<{ rules: AvailabilityRule[] }>("/api/mobile/v1/me/availability"),
  upsertAvailabilityRule: (input: {
    id?: string
    dayOfWeek: number
    startTime: string
    endTime: string
    slotMinutes: number
    type: "VIDEO_CONSULTATION" | "IN_PERSON_CONSULTATION"
    active: boolean
  }) =>
    request<{ updated: boolean }>("/api/mobile/v1/me/availability", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteAvailabilityRule: (id: string) =>
    request<{ deleted: boolean }>("/api/mobile/v1/me/availability", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),
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
  tickets: () => request<{ tickets: TicketSummary[] }>("/api/mobile/v1/tickets"),
  createTicket: (input: { subject: string; category?: TicketCategory; body: string }) =>
    request<{ ticketId: string }>("/api/mobile/v1/tickets", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  ticket: (id: string) => request<TicketDetail>(`/api/mobile/v1/tickets/${id}`),
  replyTicket: (id: string, body: string) =>
    request<{ replied: boolean }>(`/api/mobile/v1/tickets/${id}`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  home: () => request<HomeData>("/api/mobile/v1/home"),
  appointments: () =>
    request<{ appointments: Appointment[] }>("/api/mobile/v1/appointments"),
  markAppointmentNoShow: (appointmentId: string) =>
    request<{ updated: boolean }>(`/api/mobile/v1/appointments/${appointmentId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "mark_no_show" }),
    }),
  rescheduleMissedAppointment: (appointmentId: string, startsAt: string) =>
    request<{ appointmentId: string }>(`/api/mobile/v1/appointments/${appointmentId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "reschedule_after_no_show", startsAt }),
    }),
  caseSummary: (caseId: string) =>
    request<CaseSummary>(`/api/mobile/v1/cases/${caseId}`),
  myCases: () => request<{ cases: DoctorCaseItem[] }>("/api/mobile/v1/cases"),
  payments: () => request<{ payments: Payment[] }>("/api/mobile/v1/payments"),
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
  qaVideoExchange: (ticket: string) =>
    request<QaVideoGrant>("/api/mobile/v1/video-qa/exchange", {
      method: "POST",
      body: JSON.stringify({ ticket }),
    }),
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
  saveProfileWizardDetails: (input: {
    dateOfBirth?: string
    biologicalSex?: "male" | "female"
    heightCm?: number
    weightKg?: number
  }) =>
    request<{ saved: boolean }>("/api/mobile/v1/profile-wizard", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  skipProfileWizard: () =>
    request<{ skipped: boolean }>("/api/mobile/v1/profile-wizard", { method: "DELETE" }),
}

export const useHome = () =>
  useQuery({ queryKey: queryKeys.home, queryFn: api.home, staleTime: 30_000 })

export const useAppointments = () =>
  useQuery({
    queryKey: queryKeys.appointments,
    queryFn: api.appointments,
    staleTime: 30_000,
  })

export const useCaseSummary = (caseId: string | null) =>
  useQuery({
    queryKey: queryKeys.case(caseId),
    queryFn: () => api.caseSummary(caseId as string),
    enabled: caseId != null,
    staleTime: 30_000,
  })

export const useMyCases = () =>
  useQuery({ queryKey: queryKeys.cases, queryFn: api.myCases, staleTime: 30_000 })

export const usePayments = () =>
  useQuery({
    queryKey: queryKeys.payments,
    queryFn: api.payments,
    staleTime: 30_000,
  })

export const useDoctors = (q: string, filters?: DoctorFilters) =>
  useInfiniteQuery({
    queryKey: queryKeys.doctors(q, filters),
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
    queryKey: queryKeys.filterFacets,
    queryFn: api.filterFacets,
    staleTime: 5 * 60_000,
  })

export const useDoctor = (slug: string) =>
  useQuery({
    queryKey: queryKeys.doctor(slug),
    queryFn: () => api.doctor(slug),
    staleTime: 60_000,
  })

export const useServices = (q: string) =>
  useQuery({
    queryKey: queryKeys.services(q),
    queryFn: () => api.services({ q: q || undefined }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

export const useService = (slug: string) =>
  useQuery({
    queryKey: queryKeys.service(slug),
    queryFn: () => api.service(slug),
    staleTime: 60_000,
  })

export const useSlots = (slug: string, type: ConsultationType) =>
  useQuery({
    queryKey: queryKeys.slots(slug, type),
    queryFn: () => api.slots(slug, type),
    // Availability is time-sensitive; keep it fresh.
    staleTime: 15_000,
  })

export const useMe = () =>
  useQuery({ queryKey: queryKeys.me, queryFn: api.me, staleTime: 60_000 })

export const useMyPractice = () =>
  useQuery({ queryKey: queryKeys.practice, queryFn: api.myPractice, staleTime: 30_000 })

export const useMyAvailability = () =>
  useQuery({ queryKey: queryKeys.availability, queryFn: api.myAvailability, staleTime: 30_000 })

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: api.notificationPreferences,
    staleTime: 60_000,
  })

export const useNotifications = () =>
  useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.notifications,
    staleTime: 30_000,
  })

export const useFavorites = () =>
  useQuery({ queryKey: queryKeys.favorites, queryFn: api.favorites, staleTime: 30_000 })

/**
 * Toggle a doctor favourite with an optimistic heart: flips the cached
 * favourites list immediately, reconciles on success, and rolls back on
 * error. Every doctor card/heart across the app reads the same
 * `["favorites"]` cache, so one toggle updates them all at once.
 */
export const useToggleFavorite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (doctor: FavoriteDoctor) =>
      api.toggleFavorite("doctor", doctor.id),
    onMutate: async (doctor: FavoriteDoctor) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites })
      const previous = queryClient.getQueryData<{ doctors: FavoriteDoctor[] }>(
        queryKeys.favorites,
      )
      const doctors = previous?.doctors ?? []
      const already = doctors.some((d) => d.id === doctor.id)
      queryClient.setQueryData<{ doctors: FavoriteDoctor[] }>(queryKeys.favorites, {
        doctors: already
          ? doctors.filter((d) => d.id !== doctor.id)
          : [doctor, ...doctors],
      })
      return { previous }
    },
    onError: (_err, _doctor, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.favorites, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites })
    },
  })
}

export const useTickets = () =>
  useQuery({ queryKey: queryKeys.tickets, queryFn: api.tickets, staleTime: 30_000 })

export const useTicket = (id: string) =>
  useQuery({
    queryKey: queryKeys.ticket(id),
    queryFn: () => api.ticket(id),
    staleTime: 15_000,
  })

export const useVideoState = (appointmentId: string, opts?: { poll?: boolean; enabled?: boolean }) =>
  useQuery({
    queryKey: queryKeys.video(appointmentId),
    queryFn: () => api.videoState(appointmentId),
    staleTime: 15_000,
    // The pre-join screen polls so the join button appears the moment the
    // window opens (and "طبيبك في غرفة الانتظار" the moment they arrive).
    refetchInterval: opts?.poll ? 20_000 : false,
    enabled: opts?.enabled ?? true,
  })

/**
 * Downloads a payment receipt PDF to a local temp file, authenticated the
 * same way `request()` is (session cookie, not a bearer token — this app
 * has none). Returns the local file URI to hand to expo-sharing; throws on
 * any failure (network, 401, 404) so the caller can show a normal error.
 * WebBrowser.openBrowserAsync is NOT usable here — it opens an external
 * browser that never sees this app's SecureStore-held session cookie.
 */
export async function downloadInvoicePdf(paymentId: string): Promise<string> {
  const cookie = authClient.getCookie()
  return downloadToCache({
    url: `${API_URL}/api/invoices/payment/${paymentId}/pdf`,
    fileName: `med-aura-receipt-${paymentId}.pdf`,
    cookie,
    expectedContentType: "application/pdf",
  })
}

function isShareSheetDismissal(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    message.includes("cancel") ||
    message.includes("dismiss") ||
    message.includes("did not share")
  )
}

export async function presentDownloadedPdf(fileUri: string): Promise<void> {
  let shareError: unknown = null

  if (await Sharing.isAvailableAsync()) {
    try {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      })
      return
    } catch (error) {
      if (isShareSheetDismissal(error)) return
      shareError = error
    }
  }

  const canOpen = await Linking.canOpenURL(fileUri).catch(() => false)
  if (canOpen) {
    await Linking.openURL(fileUri)
    return
  }

  throw shareError instanceof Error
    ? shareError
    : new Error("تعذّر فتح الإيصال. حاول مرة أخرى.")
}

/**
 * Downloads a case document (medical photo/report) to a local temp file,
 * same authenticated pattern as `downloadInvoicePdf`. `/api/documents/{id}`
 * is authorized per-document (owner, admin, or an active grant) and every
 * view is audited server-side — this never bypasses that.
 */
export async function downloadDocument(
  documentId: string,
  fileName: string,
): Promise<string> {
  const cookie = authClient.getCookie()
  const safeName = fileName.replace(/[^\w.\-]+/g, "_")
  return downloadToCache({
    url: `${API_URL}/api/documents/${documentId}`,
    fileName: `med-aura-doc-${documentId}-${safeName}`,
    cookie,
  })
}
