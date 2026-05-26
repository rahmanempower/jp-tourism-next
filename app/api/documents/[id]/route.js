/**
 * GET    /api/documents/[id]         — get document detail + presigned download URL
 * DELETE /api/documents/[id]         — delete document (agency-scoped; also removes from S3)
 * PATCH  /api/documents/[id]/review  — admin reviews document (APPROVED | REJECTED)
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";
import { createDownloadPresignedUrl, deleteS3Object } from "@/lib/s3.js";

export async function GET(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  if (!doc) return fail("Document not found.", 404);

  if (
    (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") &&
    doc.agencyId !== session.agencyId
  ) {
    return fail("Document not found.", 404);
  }

  const downloadUrl = await createDownloadPresignedUrl(doc.s3Key);
  return ok({ ...doc, downloadUrl });
}

export async function DELETE(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER",
  ]);
  if (error) return error;

  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  if (!doc) return fail("Document not found.", 404);

  if (
    session.role === "AGENCY_OWNER" &&
    doc.agencyId !== session.agencyId
  ) {
    return fail("Document not found.", 404);
  }

  await Promise.all([
    prisma.document.delete({ where: { id: params.id } }),
    deleteS3Object(doc.s3Key),
  ]);

  return ok({ deleted: true, id: params.id });
}
