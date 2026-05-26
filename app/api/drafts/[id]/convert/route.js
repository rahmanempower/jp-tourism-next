/**
 * POST /api/drafts/[id]/convert
 *
 * Converts an approved/quoted DraftPackage into Booking(s).
 *
 * Flow:
 *   1. Validate draft (DRAFT or SENT status, belongs to agency)
 *   2. Validate customer exists
 *   3. Deduct grandTotal from agency wallet (must have sufficient balance)
 *   4. For each PackageItem → create a Booking + EscrowLedger record
 *   5. Mark draft as CONVERTED
 *   6. Update enquiry status → CONVERTED
 *   7. Write WalletTransaction ledger entry (DEBIT)
 *   8. Write AuditLog
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

const PLATFORM_COMMISSION_RATE = 0.05; // 5%

export async function POST(request, { params }) {
  const { session, error } = await requireAuth(request, ["AGENCY_OWNER"]);
  if (error) return error;

  const draft = await prisma.draftPackage.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { listing: { select: { id: true, vendorId: true, basePrice: true } } } },
      enquiry: true,
      agency: true,
    },
  });

  if (!draft) return fail("Draft not found.", 404);
  if (draft.agencyId !== session.agencyId) return fail("Draft not found.", 404);
  if (!["DRAFT", "SENT"].includes(draft.status)) {
    return fail("Only DRAFT or SENT packages can be converted.");
  }
  if (draft.items.length === 0) return fail("Draft has no items.");

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { customerId } = body;
  if (!customerId) return fail("customerId is required.");

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, agencyId: session.agencyId },
  });
  if (!customer) return fail("Customer not found.", 404);

  // Check wallet balance
  const agency = draft.agency;
  if (agency.walletBalance < draft.grandTotal) {
    return fail(`Insufficient wallet balance. Required: ${draft.grandTotal}, Available: ${agency.walletBalance}.`, 402);
  }

  const now = new Date();
  const bookings = [];

  // Run everything in a single atomic-ish operation (MongoDB doesn't support SQL transactions
  // without replica set $transaction — we use prisma.$transaction for safety)
  await prisma.$transaction(async (tx) => {
    // Deduct wallet
    await tx.agency.update({
      where: { id: session.agencyId },
      data: { walletBalance: { decrement: draft.grandTotal } },
    });

    // Wallet ledger
    await tx.walletTransaction.create({
      data: {
        agencyId: session.agencyId,
        type: "DEBIT",
        amount: draft.grandTotal,
        balanceBefore: agency.walletBalance,
        balanceAfter: parseFloat((agency.walletBalance - draft.grandTotal).toFixed(2)),
        referenceType: "DraftPackage",
        referenceId: draft.id,
        description: `Converted draft package: ${draft.title}`,
        status: "COMPLETED",
      },
    });

    // Create one booking per package item
    for (const item of draft.items) {
      const bookingRef = `BK-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      const commission = parseFloat((item.vendorPrice * PLATFORM_COMMISSION_RATE).toFixed(2));
      const escrowAmt  = item.vendorPrice * item.qty;

      const booking = await tx.booking.create({
        data: {
          bookingRef,
          agencyId: session.agencyId,
          customerId,
          draftPackageId: draft.id,
          listingId: item.listingId,
          vendorId: item.listing.vendorId,
          quantity: item.qty,
          vendorPrice: item.vendorPrice,
          agencyMargin: item.agencyMargin,
          platformCommission: commission,
          totalAmount: item.totalPrice,
          escrowAmount: escrowAmt,
          status: "PENDING",
          pipelineStage: "BOOKING_CREATED",
        },
      });

      // Escrow record
      await tx.escrowLedger.create({
        data: {
          bookingId: booking.id,
          agencyId: session.agencyId,
          vendorId: item.listing.vendorId,
          amount: escrowAmt,
          commission,
          status: "HELD",
          heldAt: now,
        },
      });

      bookings.push(booking);
    }

    // Mark draft converted
    await tx.draftPackage.update({
      where: { id: draft.id },
      data: { status: "CONVERTED" },
    });

    // Update enquiry
    await tx.enquiry.update({
      where: { id: draft.enquiryId },
      data: { status: "CONVERTED" },
    });

    // AuditLog
    await tx.auditLog.create({
      data: {
        userId: session.id,
        action: "DRAFT_CONVERTED",
        entityType: "DraftPackage",
        entityId: draft.id,
        newValue: { bookingCount: bookings.length, grandTotal: draft.grandTotal },
      },
    });
  });

  return ok({ bookings, draftId: draft.id, totalCharged: draft.grandTotal }, undefined, 201);
}
