import "./_load-env"
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3"
import { env, isR2Configured } from "@/lib/env"

/**
 * One-time (or re-run-when-origins-change) setup for the R2 bucket's CORS
 * policy. The browser uploads images directly to R2 via a presigned PUT URL
 * (see lib/storage/r2.ts's getUploadUrl) — without this, every direct upload
 * fails at the network level with a CORS preflight error, which is invisible
 * server-side (the app never even sees the failed request).
 *
 * Usage: pnpm tsx scripts/setup-r2-cors.ts
 */
async function main() {
  if (!isR2Configured()) {
    console.error("R2 is not configured (missing R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET).")
    process.exit(1)
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
    },
  })

  const allowedOrigins = [
    "https://medauraworld.com",
    "https://www.medauraworld.com",
    "http://localhost:3000",
  ]

  await client.send(
    new PutBucketCorsCommand({
      Bucket: env.R2_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: allowedOrigins,
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  )

  const current = await client.send(new GetBucketCorsCommand({ Bucket: env.R2_BUCKET }))
  console.log("✅ CORS policy applied. Current rules:")
  console.log(JSON.stringify(current.CORSRules, null, 2))
}

main().catch((err) => {
  console.error("setup-r2-cors failed:", err)
  process.exit(1)
})
