import { useQuery } from "@tanstack/react-query"
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
}

export type Me = {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  residenceCountry: string | null
  city: string | null
}

export class SessionExpiredError extends Error {}

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
  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
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
  home: () => request<HomeData>("/api/mobile/v1/home"),
  appointments: () =>
    request<{ appointments: Appointment[] }>("/api/mobile/v1/appointments"),
  doctors: (params: { q?: string; page?: number }) => {
    const sp = new URLSearchParams()
    if (params.q) sp.set("q", params.q)
    if (params.page) sp.set("page", String(params.page))
    return request<{ total: number; page: number; doctors: Doctor[] }>(
      `/api/mobile/v1/doctors?${sp.toString()}`,
      { auth: false },
    )
  },
  doctor: (slug: string) =>
    request<DoctorDetail>(`/api/mobile/v1/doctors/${slug}`, { auth: false }),
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

export const useDoctors = (q: string) =>
  useQuery({
    queryKey: ["doctors", q],
    queryFn: () => api.doctors({ q: q || undefined }),
    staleTime: 60_000,
  })

export const useDoctor = (slug: string) =>
  useQuery({
    queryKey: ["doctor", slug],
    queryFn: () => api.doctor(slug),
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
