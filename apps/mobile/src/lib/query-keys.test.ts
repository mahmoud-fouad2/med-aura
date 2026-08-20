import { describe, expect, it } from "vitest"
import { queryKeys } from "./query-keys"

describe("queryKeys", () => {
  it("uses identical keys for reads and invalidation", () => {
    expect(queryKeys.appointments).toEqual(["appointments"])
    expect(queryKeys.practice).toEqual(["my-practice"])
    expect(queryKeys.notificationPreferences).toEqual(["notification-preferences"])
  })

  it("scopes entity caches by id", () => {
    expect(queryKeys.case("case-1")).toEqual(["case", "case-1"])
    expect(queryKeys.ticket("ticket-1")).toEqual(["ticket", "ticket-1"])
    expect(queryKeys.video("appointment-1")).toEqual(["video", "appointment-1"])
  })
})
