/** Escapes text for safe interpolation into an HTML string (e.g. an email body built from admin-typed text). */
export function escapeHtml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case "&":
        return "&amp;"
      case '"':
        return "&quot;"
      case "'":
        return "&#39;"
      default:
        return c
    }
  })
}

/** Escapes then converts newlines to <br> — for rendering plain multi-line admin input as HTML email content. */
export function textToSafeHtml(text: string): string {
  return escapeHtml(text).split("\n").join("<br>")
}
