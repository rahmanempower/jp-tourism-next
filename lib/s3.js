/**
 * lib/s3.js
 *
 * S3-compatible storage helpers (DigitalOcean Spaces / AWS S3).
 * Generates presigned upload POST policies for direct browser → Spaces uploads
 * and presigned GET URLs for secure downloads.
 *
 * Required env vars:
 *   AWS_REGION            — e.g. "blr1"
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   S3_BUCKET             — bucket / space name
 *   AWS_S3_BUCKET_URL     — e.g. "https://sdhub.blr1.digitaloceanspaces.com"
 *                           Used to derive the regional endpoint and build
 *                           public/presigned download URLs.
 */
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const REGION     = process.env.AWS_REGION ?? "us-east-1";
const BUCKET     = process.env.S3_BUCKET;
const BUCKET_URL = process.env.AWS_S3_BUCKET_URL; // https://sdhub.blr1.digitaloceanspaces.com

// Derive the regional endpoint by stripping the bucket subdomain.
// e.g. https://sdhub.blr1.digitaloceanspaces.com → https://blr1.digitaloceanspaces.com
const ENDPOINT = BUCKET_URL && BUCKET
  ? BUCKET_URL.replace(`${BUCKET}.`, "")
  : null;

const s3Config = {
  region: REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};
if (ENDPOINT) {
  s3Config.endpoint          = ENDPOINT;
  s3Config.forcePathStyle    = false; // virtual-hosted style (bucket.endpoint)
}

const s3 = new S3Client(s3Config);

/**
 * Creates a presigned POST policy for direct browser → S3 upload.
 * @param {string} key        S3 object key (e.g. "documents/abc123.pdf")
 * @param {string} mimeType   Content-Type constraint
 * @param {number} maxBytes   Max file size (default 20 MB)
 * @returns {{ url, fields }} — POST to `url` with `fields` + `file` field
 */
export async function createUploadPresignedPost(key, mimeType, maxBytes = 20 * 1024 * 1024) {
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: key,
    Conditions: [
      ["content-length-range", 1, maxBytes],
      ["eq", "$Content-Type", mimeType],
    ],
    Fields: { "Content-Type": mimeType },
    Expires: 300, // 5 minutes
  });
  return { url, fields, key, bucket: BUCKET };
}

/**
 * Creates a presigned GET URL for temporary download access.
 * @param {string} key        S3 object key
 * @param {number} expiresIn  Seconds until expiry (default 15 min)
 */
export async function createDownloadPresignedUrl(key, expiresIn = 900) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Deletes an S3 object permanently.
 * @param {string} key  S3 object key
 */
export async function deleteS3Object(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
