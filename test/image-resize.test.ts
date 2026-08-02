import { describe, it, expect } from "vitest"
import { computeResizeDimensions } from "@/lib/client/image-resize"

describe("computeResizeDimensions", () => {
  it("returns null (leave untouched) when already within the cap", () => {
    expect(computeResizeDimensions(1200, 800, 1600)).toBeNull()
    expect(computeResizeDimensions(1600, 900, 1600)).toBeNull()
  })

  it("downscales a wide image, preserving aspect ratio", () => {
    expect(computeResizeDimensions(3200, 1800, 1600)).toEqual({ width: 1600, height: 900 })
  })

  it("downscales a tall image by its longest edge, not width", () => {
    expect(computeResizeDimensions(1200, 4000, 1600)).toEqual({ width: 480, height: 1600 })
  })

  it("uses the default 1600px cap when none is given", () => {
    expect(computeResizeDimensions(4000, 3000)).toEqual({ width: 1600, height: 1200 })
  })
})
