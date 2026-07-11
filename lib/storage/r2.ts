import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env, isR2Configured } from "@/lib/env"
import { notConfigured } from "@/lib/errors"

/**
 * Cloudflare R2 (S3-compatible) storage.
 *
 * Private medical files ALWAYS use short-lived signed URLs — never the public
 * base URL. The public base URL is only for genuinely public assets (logos,
 * gallery). When credentials are missing, callers get a clear NOT_CONFIGURED
 * error instead of a fake success.
 */

export { isR2Configured }

let client: S3Client | null = null

function getClient(): S3Client {
  if (!isR2Configured()) {
    throw notConfigured("خدمة رفع الملفات غير مفعّلة حاليًا.")
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
      },
    })
  }
  return client
}

/** Presigned URL the browser can PUT to directly. */
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(getClient(), command, { expiresIn })
}

/** Short-lived signed read URL — use for ALL private medical files. */
export async function getSignedReadUrl(
  key: string,
  expiresIn = 300,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key })
  return getSignedUrl(getClient(), command, { expiresIn })
}

/** Public URL for non-sensitive assets only (requires R2_PUBLIC_BASE_URL). */
export function getPublicUrl(key: string): string | null {
  if (
    key.startsWith("demo-doctors/") ||
    key.startsWith("demo-services/") ||
    key.startsWith("brand/")
  ) {
    return `/${key}`
  }
  if (!env.R2_PUBLIC_BASE_URL) return null
  return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`
}

/** Downloads an object's raw bytes — used server-side only (e.g. to
 *  watermark an upload before it's re-stored under its public key). */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
  )
  const body = res.Body
  if (!body) throw new Error(`R2 object has no body: ${key}`)
  const chunks: Uint8Array[] = []
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/** Uploads raw bytes directly from the server (no presigned round trip). */
export async function putObjectBuffer(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await getClient().send(
      new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
    )
    return true
  } catch {
    return false
  }
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
  )
}

/** Namespaced object key, e.g. cases/<caseId>/<uuid>-photo.jpg */
export function buildObjectKey(prefix: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80)
  return `${prefix}/${crypto.randomUUID()}-${safe}`
}
