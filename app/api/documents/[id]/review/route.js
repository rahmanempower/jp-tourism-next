/**
 * PATCH /api/documents/[id]/review
 *
 * Admin reviews a document: APPROVED or REJECTED.
 * Body: { reviewStatus: "APPROVED" | "REJECTED", reviewNote? }
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

const ALLOWED = ["APPROVED", "REJECTED"];

export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(request, ["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  if (!doc) return fail("Document not found.", 404);

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { reviewStatus, reviewNote } = body;
  if (!reviewStatus || !ALLOWED.includes(reviewStatus)) {
    return fail(`reviewStatus must be one of: ${ALLOWED.join(", ")}`);
  }

  const updated = await prisma.document.update({
    where: { id: params.id },
    data: {
      reviewStatus,
      reviewedBy: session.id,
      reviewNote: reviewNote?.trim() ?? null,
    },
  });

  return ok(updated);
}
