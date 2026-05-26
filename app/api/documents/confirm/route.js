/**
 * POST /api/documents/confirm
 *
 * Called by the client after a successful S3 direct upload.
 * Saves the document record to the database.
 *
 * Body: { bookingId, customerId, agencyId, type, name, mimeType, fileSizeBytes, s3Key, s3Bucket }
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function POST(request) {
  const { session, error } = await requireAuth(request, [
    "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { bookingId, customerId, type, name, mimeType, fileSizeBytes, s3Key, s3Bucket } = body;
  const required = { bookingId, customerId, type, name, mimeType, fileSizeBytes, s3Key, s3Bucket };
  for (const [field, val] of Object.entries(required)) {
    if (!val) return fail(`${field} is required.`);
  }

  // Enforce agency isolation
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.agencyId !== session.agencyId) {
    return fail("Booking not found.", 404);
  }

  const doc = await prisma.document.create({
    data: {
      bookingId,
      customerId,
      agencyId: session.agencyId,
      type,
      name,
      mimeType,
      fileSizeBytes: parseInt(fileSizeBytes),
      s3Key,
      s3Bucket,
      reviewStatus: "PENDING",
    },
  });

  return ok(doc, undefined, 201);
}
