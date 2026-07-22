import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import * as FileSystem from "expo-file-system/legacy"
import { api } from "./api"

export type PickedImage = { uri: string; mimeType: string; sizeBytes: number }

export type PickResult =
  | { status: "picked"; image: PickedImage }
  | { status: "canceled" }
  | { status: "denied"; canAskAgain: boolean }
  | { status: "error" }

// The picker's own edit step already produces a square (1:1) crop; this only
// downsizes and re-compresses so we never upload a multi-megabyte original.
async function processAsset(uri: string): Promise<PickedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800, height: 800 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  )
  const info = await FileSystem.getInfoAsync(result.uri)
  const sizeBytes = info.exists && !info.isDirectory ? info.size : 0
  return { uri: result.uri, mimeType: "image/jpeg", sizeBytes }
}

/** Only ever called from an explicit "اختيار من المعرض" tap. */
export async function pickFromLibrary(): Promise<PickResult> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return { status: "denied", canAskAgain: perm.canAskAgain }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    })
    if (result.canceled || !result.assets[0]) return { status: "canceled" }
    return { status: "picked", image: await processAsset(result.assets[0].uri) }
  } catch {
    return { status: "error" }
  }
}

/** Only ever called from an explicit "التقاط صورة" tap. */
export async function takePhoto(): Promise<PickResult> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return { status: "denied", canAskAgain: perm.canAskAgain }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    })
    if (result.canceled || !result.assets[0]) return { status: "canceled" }
    return { status: "picked", image: await processAsset(result.assets[0].uri) }
  } catch {
    return { status: "error" }
  }
}

export type UploadResult =
  | { ok: true; photoUrl: string | null }
  | { ok: false; error: string }

/** Presign → PUT the compressed bytes → finalize. Never leaves a half-set photo. */
export async function uploadAvatar(image: PickedImage): Promise<UploadResult> {
  try {
    const { uploadUrl, objectKey } = await api.avatarPresign({
      fileName: "avatar.jpg",
      contentType: image.mimeType,
      sizeBytes: image.sizeBytes,
    })

    const uploadResult = await FileSystem.uploadAsync(uploadUrl, image.uri, {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": image.mimeType },
    })
    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      return { ok: false, error: "تعذّر رفع الصورة. حاول مرة أخرى." }
    }

    const { photoUrl } = await api.avatarFinalize(objectKey)
    return { ok: true, photoUrl }
  } catch {
    return { ok: false, error: "تعذّر رفع الصورة. تحقق من اتصالك وحاول مرة أخرى." }
  }
}

export async function removeAvatar(): Promise<UploadResult> {
  try {
    await api.avatarRemove()
    return { ok: true, photoUrl: null }
  } catch {
    return { ok: false, error: "تعذّر حذف الصورة. حاول مرة أخرى." }
  }
}
