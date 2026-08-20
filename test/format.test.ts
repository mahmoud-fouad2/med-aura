import { describe, expect, it } from "vitest"
import {
  formatDoctorCount,
  formatExperience,
  formatRecoveryDays,
} from "@/lib/format"
import { formatMoney } from "@/lib/money"

describe("localized display formatters", () => {
  it("uses correct Arabic forms for recovery days", () => {
    expect(formatRecoveryDays(1)).toContain("يوم واحد")
    expect(formatRecoveryDays(2)).toContain("يومين")
    expect(formatRecoveryDays(3)).toContain("3 أيام")
    expect(formatRecoveryDays(21)).toContain("21 يومًا")
  })

  it("formats English values without RTL labels", () => {
    expect(formatRecoveryDays(1, "en")).toContain("1 day")
    expect(formatExperience(12, "en")).toBe("12 years experience")
    expect(formatDoctorCount(2, "en")).toBe("2 doctors")
    expect(formatMoney(300, "SAR", "en")).toBe("300 SAR")
  })
})
