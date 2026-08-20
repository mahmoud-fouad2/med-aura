export const ASSISTANT_CONTEXT_LIMIT = 12
export const ASSISTANT_VISIBLE_LIMIT = 60

export function keepRecentItems<T>(items: T[], limit: number): T[] {
  return items.length > limit ? items.slice(-limit) : items
}
