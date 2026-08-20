export function consumeNdjsonChunk(
  remainder: string,
  chunk: string,
  flush = false,
): { events: Record<string, unknown>[]; remainder: string } {
  const lines = `${remainder}${chunk}`.split("\n")
  let nextRemainder = lines.pop() ?? ""
  if (flush && nextRemainder.trim()) {
    lines.push(nextRemainder)
    nextRemainder = ""
  }

  const events: Record<string, unknown>[] = []
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    try {
      const event = JSON.parse(line) as unknown
      if (event && typeof event === "object" && !Array.isArray(event)) {
        events.push(event as Record<string, unknown>)
      }
    } catch {
      // A malformed complete line is isolated; later valid events still load.
    }
  }
  return { events, remainder: nextRemainder }
}
