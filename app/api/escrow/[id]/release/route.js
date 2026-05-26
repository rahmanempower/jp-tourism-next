/**
 * POST /api/escrow/[id]/release
 *
 * Admin releases held escrow to the vendor when booking is COMPLETED.
 * Updates:
 *   - EscrowLedger → RELEASED
 *   - Booking → COMPLETED (if not already)
 *   - AuditLog
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function POST(request, { params }) {
  const { session, error } = await requireAuth(request, ["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const escrow = await prisma.escrowLedger.findUnique({
    where: { id: params.id },
    include: { booking: true },
  });

  if (!escrow) return fail("Escrow record not found.", 404);
  if (escrow.status !== "HELD") return fail("Escrow is not in HELD status.");

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.escrowLedger.update({
      where: { id: params.id },
      data: { status: "RELEASED", releasedAt: now, releasedBy: session.id },
    });

    if (escrow.booking.status !== "COMPLETED") {
      await tx.booking.update({
        where: { id: escrow.bookingId },
        data: { status: "COMPLETED", pipelineStage: "COMPLETED" },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: session.id,
        action: "ESCROW_RELEASED",
        entityType: "EscrowLedger",
        entityId: params.id,
        oldValue: { status: "HELD" },
        newValue: { status: "RELEASED", releasedAt: now },
      },
    });
  });

  return ok({ released: true, escrowId: params.id, bookingId: escrow.bookingId });
}
