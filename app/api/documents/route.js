/**
 * GET  /api/documents          — list documents (scoped by role)
 * POST /api/documents/presign  — request a presigned S3 upload URL
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function GET(request) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page       = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit      = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip       = (page - 1) * limit;
  const bookingId  = searchParams.get("bookingId");
  const customerId = searchParams.get("customerId");
  const status     = searchParams.get("reviewStatus");

  const where = {};
  if (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") {
    where.agencyId = session.agencyId;
  }
  if (bookingId)  where.bookingId  = bookingId;
  if (customerId) where.customerId = customerId;
  if (status)     where.reviewStatus = status;

  const [docs, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip,
      take: limit,
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true, name: true, type: true, mimeType: true,
        fileSizeBytes: true, reviewStatus: true, uploadedAt: true,
        bookingId: true, customerId: true, agencyId: true,
        // never expose s3Key directly in list
      },
    }),
    prisma.document.count({ where }),
  ]);

  return ok(docs, { total, page, limit, pages: Math.ceil(total / limit) });
}
