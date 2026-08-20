export class SessionExpiredError extends Error {}

export class NetworkError extends Error {}

export class TimeoutError extends NetworkError {}

export class RateLimitedError extends Error {}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function isApiErrorStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status
}

type ErrorCopy = {
  fallback: string
  offline: string
  timeout: string
  validation?: string
  conflict?: string
  rateLimited?: string
}

export function localizedApiError(
  error: unknown,
  locale: "ar" | "en",
  copy: ErrorCopy,
): string {
  if (error instanceof TimeoutError) return copy.timeout
  if (error instanceof NetworkError) return copy.offline
  if (error instanceof ApiError) {
    if (locale === "ar" && error.message) return error.message
    if (error.code === "VALIDATION" && copy.validation) return copy.validation
    if (error.code === "CONFLICT" && copy.conflict) return copy.conflict
    if (error.code === "RATE_LIMITED" && copy.rateLimited) return copy.rateLimited
  }
  return copy.fallback
}
