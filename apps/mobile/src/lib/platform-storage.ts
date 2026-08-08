import { Platform } from "react-native"
import * as SecureStore from "expo-secure-store"

export function browserStorage(): Storage | null {
  if (Platform.OS !== "web" || typeof globalThis.localStorage === "undefined") {
    return null
  }
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export async function readPlatformStorage(key: string): Promise<string | null> {
  const storage = browserStorage()
  if (storage) return storage.getItem(key)
  return SecureStore.getItemAsync(key)
}

export async function writePlatformStorage(key: string, value: string): Promise<void> {
  const storage = browserStorage()
  if (storage) {
    storage.setItem(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

export async function removePlatformStorage(key: string): Promise<void> {
  const storage = browserStorage()
  if (storage) {
    storage.removeItem(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}