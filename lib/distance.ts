import { sql, type SQL } from "drizzle-orm"
import type { AnyPgColumn } from "drizzle-orm/pg-core"

export const MIN_LATITUDE = -90
export const MAX_LATITUDE = 90
export const MIN_LONGITUDE = -180
export const MAX_LONGITUDE = 180
/** Sane upper bound on a client-requested search radius — keeps radiusKm
 *  from turning into an unbounded, unindexed distance scan. */
export const MAX_RADIUS_KM = 500

export function isValidLatitude(v: number): boolean {
  return Number.isFinite(v) && v >= MIN_LATITUDE && v <= MAX_LATITUDE
}

export function isValidLongitude(v: number): boolean {
  return Number.isFinite(v) && v >= MIN_LONGITUDE && v <= MAX_LONGITUDE
}

const EARTH_RADIUS_KM = 6371

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance between two real coordinates, in kilometers. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * SQL Haversine distance (km) from a fixed (lat, lng) to a row's coordinate
 * columns. Evaluates to NULL when either column is NULL, so a center without
 * real coordinates sorts last (nulls last) instead of being assigned a fake
 * distance — this is what keeps sort=nearest honest at the database level.
 */
export function haversineKmSql(
  latCol: AnyPgColumn,
  lngCol: AnyPgColumn,
  lat: number,
  lng: number,
): SQL<number | null> {
  return sql<number | null>`(${EARTH_RADIUS_KM} * acos(least(1.0, greatest(-1.0,
    cos(radians(${lat})) * cos(radians(${latCol})) * cos(radians(${lngCol}) - radians(${lng}))
    + sin(radians(${lat})) * sin(radians(${latCol}))
  ))))`
}
