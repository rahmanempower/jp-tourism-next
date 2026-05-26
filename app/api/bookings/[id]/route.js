/**
 * GET   /api/bookings/[id]   — booking detail
 * PATCH /api/bookings/[id]   — update pipeline stage / notes (Admin, Vendor, Agency)
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

const ALLOWED_STAGES = [
  "ENQUIRY", "BOOKING_CREATED", "DOCS_SUBMITTED", "PROCESSING", "COMPLETED",
];

async function resolveBooking(id, session) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      listing:  { select: { id: true, title: true, category: true, slaDays: true, requiredDocuments: true } },
      vendor:   { select: { id: true, businessName: true, contactEmail: true } },
      agency:   { select: { id: true, businessName: true } },
      escrow:   true,
      documents: { select: { id: true, name: true, type: true, reviewStatus: true } },
    },
  });
  if (!booking) return null;

  if (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") {
    if (booking.agencyId !== session.agencyId) return null;
  } else if (session.role === "VENDOR") {
    if (booking.vendorId !== session.vendorId) return null;
  }
  return booking;
}

export async function GET(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "VENDOR", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const booking = await resolveBooking(params.id, session);
  if (!booking) return fail("Booking not found.", 404);

  return ok(booking);
}

export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "VENDOR", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const booking = await resolveBooking(params.id, session);
  if (!booking) return fail("Booking not found.", 404);

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { pipelineStage, notes, status } = body;

  // Vendors can only move pipeline stage; agency can update notes
  if (pipelineStage && !ALLOWED_STAGES.includes(pipelineStage)) {
    return fail(`Invalid pipelineStage. Allowed: ${ALLOWED_STAGES.join(", ")}`);
  }

  const updateData = {};
  if (pipelineStage) updateData.pipelineStage = pipelineStage;
  if (notes !== undefined) updateData.notes = notes?.trim() ?? null;

  // Only Admin can change status directly
  if (status) {
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
      return fail("Only admins can change booking status.", 403);
    }
    const VALID = ["PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"];
    if (!VALID.includes(status)) return fail(`Invalid status. Allowed: ${VALID.join(", ")}`);
    updateData.status = status;
  }

  if (Object.keys(updateData).length === 0) return fail("No updatable fields provided.");

  const updated = await prisma.booking.update({ where: { id: params.id }, data: updateData });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: "BOOKING_UPDATED",
      entityType: "Booking",
      entityId: params.id,
      oldValue: { pipelineStage: booking.pipelineStage, status: booking.status },
      newValue: updateData,
    },
  });

  return ok(updated);
}
