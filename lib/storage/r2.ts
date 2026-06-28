import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

/**
 * Cloudflare R2 storage helper (S3-compatible).
 *
 * Configured via environment variables:
 *  - R2_ACCOUNT_ID
 *  - R2_ACCESS_KEY_ID
 *  - R2_SECRET_ACCESS_KEY
 *  - R2_BUCKET
 *  - R2_PUBLIC_BASE_URL   (optional: public bucket / custom domain for reads)
 *
 * When credentials are missing, the helper is "not configured" and callers
 * should surface a clear message instead of failing silently.
 */

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucket = process.env.R2_BUCKET
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL

export const isR2Configured = Boolean(accountId && accessKeyId && secretAccessKey && bucket)

let client: S3Client | null = null

function getClient(): S3Client {
  if (!isR2Configured) {
    throw new Error("R2 storage is not configured. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.")
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
      },
    })
  }
  return client
}

/** Presigned URL the browser can PUT to directly. */
export async function getUploadUrl(key: string, contentType: string, expiresIn = 600) {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType })
  return getSignedUrl(getClient(), command, { expiresIn })
}

/** Resolve a stored object key to a URL the browser can read. */
export async function getReadUrl(key: string, expiresIn = 3600): Promise<string> {
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${key}`
  }
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(getClient(), command, { expiresIn })
}

export async function deleteObject(key: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

/** Build a namespaced object key, e.g. doctors/<id>/<uuid>-photo.jpg */
export function buildObjectKey(prefix: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `${prefix}/${crypto.randomUUID()}-${safe}`
}
