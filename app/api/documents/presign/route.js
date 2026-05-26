/**
 * POST /api/documents/presign
 *
 * Returns a presigned S3 POST policy for direct browser → S3 upload.
 * After upload completes, client calls POST /api/documents/confirm to
 * register the document in the database.
 *
 * Body: { bookingId, customerId, type, name, mimeType, fileSizeBytes }
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";
import { createUploadPresignedPost } from "@/lib/s3.js";
import { randomUUID } from "crypto";

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request) {
  const { session, error } = await requireAuth(request, [
    "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { bookingId, customerId, type, name, mimeType, fileSizeBytes } = body;
  if (!bookingId)    return fail("bookingId is required.");
  if (!customerId)   return fail("customerId is required.");
  if (!type)         return fail("type is required.");
  if (!name)         return fail("name is required.");
  if (!mimeType)     return fail("mimeType is required.");
  if (!ALLOWED_MIME.includes(mimeType)) {
    return fail(`Unsupported mimeType. Allowed: ${ALLOWED_MIME.join(", ")}`);
  }
  if (!fileSizeBytes || fileSizeBytes > MAX_SIZE) {
    return fail("fileSizeBytes must be between 1 and 20971520 (20 MB).");
  }

  // Verify booking belongs to this agency
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.agencyId !== session.agencyId) {
    return fail("Booking not found.", 404);
  }

  const ext = mimeType.split("/")[1].replace("jpeg", "jpg");
  const key = `documents/${session.agencyId}/${bookingId}/${randomUUID()}.${ext}`;

  const presigned = await createUploadPresignedPost(key, mimeType, fileSizeBytes);

  return ok({
    ...presigned,
    // Metadata client must POST back to /api/documents/confirm
    meta: { bookingId, customerId, agencyId: session.agencyId, type, name, mimeType, fileSizeBytes, s3Key: key, s3Bucket: presigned.bucket },
  });
}
