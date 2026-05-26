/**
 * GET  /api/bookings  — list bookings (role-scoped)
 * POST /api/bookings  — admin/agency direct booking creation (single listing, no draft)
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function GET(request) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "VENDOR", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip   = (page - 1) * limit;
  const status = searchParams.get("status");

  const where = {};
  if (status) where.status = status;

  if (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") {
    where.agencyId = session.agencyId;
  } else if (session.role === "VENDOR") {
    where.vendorId = session.vendorId;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer:  { select: { id: true, firstName: true, lastName: true, phone: true } },
        listing:   { select: { id: true, title: true, category: true } },
        vendor:    { select: { id: true, businessName: true } },
        agency:    { select: { id: true, businessName: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return ok(bookings, { total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(request) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER",
  ]);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { listingId, customerId, quantity, notes } = body;
  if (!listingId)  return fail("listingId is required.");
  if (!customerId) return fail("customerId is required.");
  if (!quantity || quantity < 1) return fail("quantity must be ≥ 1.");

  // Resolve agency
  const agencyId = session.agencyId;
  if (!agencyId) return fail("No agency associated with this account.");

  const [listing, customer, agency] = await Promise.all([
    prisma.serviceListing.findFirst({
      where: { id: listingId, status: "APPROVED" },
      include: { vendor: { select: { id: true, isActive: true } } },
    }),
    prisma.customer.findFirst({ where: { id: customerId, agencyId } }),
    prisma.agency.findUnique({ where: { id: agencyId } }),
  ]);

  if (!listing)          return fail("Listing not found or not approved.", 404);
  if (!listing.vendor.isActive) return fail("Vendor is inactive.");
  if (!customer)         return fail("Customer not found.", 404);

  const marginPercent = agency.marginPercent ?? 2;
  const vendorPrice   = listing.basePrice;
  const agencyMargin  = parseFloat((vendorPrice * marginPercent / 100).toFixed(2));
  const totalAmount   = parseFloat(((vendorPrice + agencyMargin) * quantity).toFixed(2));
  const commission    = parseFloat((vendorPrice * 0.05).toFixed(2));
  const escrowAmount  = parseFloat((vendorPrice * quantity).toFixed(2));

  if (agency.walletBalance < totalAmount) {
    return fail(`Insufficient wallet balance. Required: ${totalAmount}, Available: ${agency.walletBalance}.`, 402);
  }

  const now = new Date();
  const bookingRef = `BK-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;

  let booking;
  await prisma.$transaction(async (tx) => {
    booking = await tx.booking.create({
      data: {
        bookingRef,
        agencyId,
        customerId,
        listingId,
        vendorId: listing.vendor.id,
        quantity,
        vendorPrice,
        agencyMargin,
        platformCommission: commission,
        totalAmount,
        escrowAmount,
        status: "PENDING",
        pipelineStage: "BOOKING_CREATED",
        notes: notes?.trim() ?? null,
      },
    });

    await tx.escrowLedger.create({
      data: {
        bookingId: booking.id,
        agencyId,
        vendorId: listing.vendor.id,
        amount: escrowAmount,
        commission,
        status: "HELD",
        heldAt: now,
      },
    });

    await tx.agency.update({
      where: { id: agencyId },
      data: { walletBalance: { decrement: totalAmount } },
    });

    await tx.walletTransaction.create({
      data: {
        agencyId,
        type: "DEBIT",
        amount: totalAmount,
        balanceBefore: agency.walletBalance,
        balanceAfter: parseFloat((agency.walletBalance - totalAmount).toFixed(2)),
        referenceType: "Booking",
        referenceId: booking.id,
        description: `Booking ${bookingRef} — ${listing.title}`,
        status: "COMPLETED",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.id,
        action: "BOOKING_CREATED",
        entityType: "Booking",
        entityId: booking.id,
        newValue: { bookingRef, totalAmount },
      },
    });
  });

  return ok(booking, undefined, 201);
}
