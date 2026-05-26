/**
 * POST /api/bookings/[id]/cancel
 *
 * Cancels a booking if still PENDING or CONFIRMED.
 * Admin can cancel any booking; Agency can only cancel own pending bookings.
 *
 * Refund policy:
 *   - If listing has refundablePercent > 0, credits that percentage back to wallet
 *   - Releases escrow (REFUNDED status)
 *   - Writes WalletTransaction REFUND + AuditLog
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function POST(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER",
  ]);
  if (error) return error;

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { refundablePercent: true, title: true } },
      escrow: true,
      agency: true,
    },
  });

  if (!booking) return fail("Booking not found.", 404);

  // Role check
  if (session.role === "AGENCY_OWNER" && booking.agencyId !== session.agencyId) {
    return fail("Booking not found.", 404);
  }

  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    return fail("Only PENDING or CONFIRMED bookings can be cancelled.");
  }

  let body = {};
  try { body = await request.json(); } catch { /* no body required */ }
  const reason = body.reason?.trim() ?? "Cancelled by user.";

  const refundPercent = booking.listing?.refundablePercent ?? 0;
  const refundAmount  = parseFloat((booking.totalAmount * refundPercent / 100).toFixed(2));
  const agency = booking.agency;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: params.id },
      data: { status: "CANCELLED", notes: reason },
    });

    if (booking.escrow) {
      await tx.escrowLedger.update({
        where: { id: booking.escrow.id },
        data: { status: "REFUNDED", releasedAt: new Date() },
      });
    }

    if (refundAmount > 0) {
      await tx.agency.update({
        where: { id: booking.agencyId },
        data: { walletBalance: { increment: refundAmount } },
      });

      await tx.walletTransaction.create({
        data: {
          agencyId: booking.agencyId,
          type: "REFUND",
          amount: refundAmount,
          balanceBefore: agency.walletBalance,
          balanceAfter: parseFloat((agency.walletBalance + refundAmount).toFixed(2)),
          referenceType: "Booking",
          referenceId: booking.id,
          description: `Refund for cancelled booking ${booking.bookingRef}`,
          status: "COMPLETED",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: session.id,
        action: "BOOKING_CANCELLED",
        entityType: "Booking",
        entityId: params.id,
        oldValue: { status: booking.status },
        newValue: { status: "CANCELLED", reason, refundAmount },
      },
    });
  });

  return ok({ cancelled: true, refundAmount, bookingRef: booking.bookingRef });
}
