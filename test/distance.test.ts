import { describe, it, expect } from "vitest"
import {
  isValidLatitude,
  isValidLongitude,
  haversineKm,
  MAX_RADIUS_KM,
  MIN_LATITUDE,
  MAX_LATITUDE,
  MIN_LONGITUDE,
  MAX_LONGITUDE,
} from "@/lib/distance"

describe("coordinate validation", () => {
  it("accepts the exact boundary values", () => {
    expect(isValidLatitude(MIN_LATITUDE)).toBe(true)
    expect(isValidLatitude(MAX_LATITUDE)).toBe(true)
    expect(isValidLongitude(MIN_LONGITUDE)).toBe(true)
    expect(isValidLongitude(MAX_LONGITUDE)).toBe(true)
  })

  it("rejects values just past the boundary", () => {
    expect(isValidLatitude(90.0001)).toBe(false)
    expect(isValidLatitude(-90.0001)).toBe(false)
    expect(isValidLongitude(180.0001)).toBe(false)
    expect(isValidLongitude(-180.0001)).toBe(false)
  })

  it("rejects NaN and Infinity", () => {
    expect(isValidLatitude(NaN)).toBe(false)
    expect(isValidLatitude(Infinity)).toBe(false)
    expect(isValidLatitude(-Infinity)).toBe(false)
    expect(isValidLongitude(NaN)).toBe(false)
    expect(isValidLongitude(Infinity)).toBe(false)
  })

  it("has a sane, finite, positive radius cap", () => {
    expect(Number.isFinite(MAX_RADIUS_KM)).toBe(true)
    expect(MAX_RADIUS_KM).toBeGreaterThan(0)
  })
})

describe("haversineKm", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineKm(24.7136, 46.6753, 24.7136, 46.6753)).toBeCloseTo(0, 6)
  })

  it("matches the known Riyadh -> Jeddah distance (~850km)", () => {
    const d = haversineKm(24.7136, 46.6753, 21.4858, 39.1925)
    expect(d).toBeGreaterThan(830)
    expect(d).toBeLessThan(870)
  })

  it("matches the known London -> Paris distance (~344km)", () => {
    const d = haversineKm(51.5074, -0.1278, 48.8566, 2.3522)
    expect(d).toBeGreaterThan(330)
    expect(d).toBeLessThan(360)
  })

  it("never returns NaN or Infinity, even near-antipodal", () => {
    const d = haversineKm(0, 0, 0, 179.9999)
    expect(Number.isFinite(d)).toBe(true)
    expect(d).toBeGreaterThan(0)
  })

  it("is symmetric regardless of argument order", () => {
    const a = haversineKm(24.7136, 46.6753, 21.4858, 39.1925)
    const b = haversineKm(21.4858, 39.1925, 24.7136, 46.6753)
    expect(a).toBeCloseTo(b, 6)
  })
})
