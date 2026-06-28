/**
 * Typed application errors + safe, human, Arabic-first messages for the UI.
 * Technical detail stays in logs; patients never see "Database error" etc.
 */
export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_CONFIGURED"
  | "RATE_LIMITED"
  | "INTERNAL"

export class AppError extends Error {
  code: ErrorCode
  httpStatus: number
  /** Safe message to show end users (Arabic). */
  userMessage: string
  details?: unknown

  constructor(
    code: ErrorCode,
    opts: { userMessage?: string; message?: string; details?: unknown } = {},
  ) {
    super(opts.message ?? opts.userMessage ?? code)
    this.code = code
    this.httpStatus = HTTP_STATUS[code]
    this.userMessage = opts.userMessage ?? DEFAULT_USER_MESSAGE[code]
    this.details = opts.details
  }
}

const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  NOT_CONFIGURED: 503,
  RATE_LIMITED: 429,
  INTERNAL: 500,
}

const DEFAULT_USER_MESSAGE: Record<ErrorCode, string> = {
  UNAUTHORIZED: "يرجى تسجيل الدخول للمتابعة.",
  FORBIDDEN: "ليست لديك صلاحية للوصول إلى هذا المحتوى.",
  NOT_FOUND: "العنصر المطلوب غير موجود.",
  VALIDATION: "تحقق من البيانات المدخلة وحاول مرة أخرى.",
  CONFLICT: "تعذّر إتمام العملية لوجود تعارض، يرجى المحاولة من جديد.",
  NOT_CONFIGURED: "هذه الخدمة غير مفعّلة حاليًا. يرجى المحاولة لاحقًا.",
  RATE_LIMITED: "عدد المحاولات كبير، يرجى الانتظار قليلًا ثم المحاولة مجددًا.",
  INTERNAL: "حدث خطأ غير متوقع. فريقنا على علم بذلك، حاول لاحقًا.",
}

export const unauthorized = (m?: string) =>
  new AppError("UNAUTHORIZED", { userMessage: m })
export const forbidden = (m?: string) =>
  new AppError("FORBIDDEN", { userMessage: m })
export const notFound = (m?: string) =>
  new AppError("NOT_FOUND", { userMessage: m })
export const validation = (m?: string, details?: unknown) =>
  new AppError("VALIDATION", { userMessage: m, details })
export const conflict = (m?: string) =>
  new AppError("CONFLICT", { userMessage: m })
export const notConfigured = (m?: string) =>
  new AppError("NOT_CONFIGURED", { userMessage: m })

/** Convert any thrown value into a safe shape for API/action responses. */
export function toSafeError(err: unknown): {
  code: ErrorCode
  userMessage: string
  httpStatus: number
} {
  if (err instanceof AppError) {
    return { code: err.code, userMessage: err.userMessage, httpStatus: err.httpStatus }
  }
  return {
    code: "INTERNAL",
    userMessage: DEFAULT_USER_MESSAGE.INTERNAL,
    httpStatus: 500,
  }
}
