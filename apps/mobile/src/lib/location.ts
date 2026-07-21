import * as Location from "expo-location"

export type Coords = { lat: number; lng: number }

export type LocationResult =
  | { status: "granted"; coords: Coords }
  | { status: "denied" }
  | { status: "error" }

/**
 * Requests foreground location permission and reads the current position.
 * Only ever called from an explicit user tap — never on app start.
 */
export async function requestLocation(): Promise<LocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") return { status: "denied" }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })
    return {
      status: "granted",
      coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
    }
  } catch {
    return { status: "error" }
  }
}
