/**
 * Minimal structured logger. JSON lines in production (easy to ship to a log
 * sink), readable text in development. Replaces ad-hoc `[v0]` console calls.
 */
type Level = "debug" | "info" | "warn" | "error"

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  const isProd = process.env.NODE_ENV === "production"
  if (isProd) {
    const line = JSON.stringify({
      level,
      message,
      time: new Date().toISOString(),
      ...meta,
    })
    ;(level === "error" ? console.error : console.log)(line)
  } else {
    const prefix = `[${level}]`
    const args: unknown[] = [prefix, message]
    if (meta && Object.keys(meta).length) args.push(meta)
    ;(level === "error" ? console.error : console.log)(...args)
  }
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => emit("debug", m, meta),
  info: (m: string, meta?: Record<string, unknown>) => emit("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit("error", m, meta),
}
