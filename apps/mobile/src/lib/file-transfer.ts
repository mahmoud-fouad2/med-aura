import { File, Paths } from "expo-file-system"
import { fetch as expoFetch } from "expo/fetch"
import { SessionExpiredError } from "./request-errors"

type DownloadInput = {
  url: string
  fileName: string
  cookie?: string
  expectedContentType?: string
}

/** Authenticated download using Expo 57's modern File API. */
export async function downloadToCache(input: DownloadInput): Promise<string> {
  const response = await expoFetch(input.url, {
    headers: input.cookie ? { Cookie: input.cookie } : {},
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (!response.ok) throw new Error(`download failed (${response.status})`)

  const contentType = response.headers.get("content-type") ?? ""
  if (input.expectedContentType && !contentType.includes(input.expectedContentType)) {
    throw new Error("unexpected download content type")
  }

  const file = new File(Paths.cache, input.fileName)
  file.create({ overwrite: true, intermediates: true })
  try {
    file.write(await response.bytes())
    return file.uri
  } catch (error) {
    if (file.exists) file.delete()
    throw error
  }
}
