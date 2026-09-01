import AsyncStorage from "@react-native-async-storage/async-storage"

const PENDING_REFERRAL_KEY = "medaura.pending-referral"

export async function savePendingReferralCode(value: string): Promise<void> {
  const code = value.trim().toUpperCase().slice(0, 20)
  if (code) await AsyncStorage.setItem(PENDING_REFERRAL_KEY, code)
  else await AsyncStorage.removeItem(PENDING_REFERRAL_KEY)
}

export async function getPendingReferralCode(): Promise<string | undefined> {
  return (await AsyncStorage.getItem(PENDING_REFERRAL_KEY)) ?? undefined
}

export async function clearPendingReferralCode(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_REFERRAL_KEY)
}
