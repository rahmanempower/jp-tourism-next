/**
 * GET    /api/customers/[id]   — customer detail
 * PUT    /api/customers/[id]   — update customer profile
 * DELETE /api/customers/[id]   — soft-delete (mark inactive via tags; full delete admin only)
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

async function resolveCustomer(id, session) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      enquiries: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, status: true, createdAt: true } },
      bookings:  { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, bookingRef: true, status: true, totalAmount: true } },
      _count: { select: { enquiries: true, bookings: true, documents: true } },
    },
  });
  if (!customer) return null;

  if (
    (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") &&
    customer.agencyId !== session.agencyId
  ) {
    return null;
  }
  return customer;
}

export async function GET(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const customer = await resolveCustomer(params.id, session);
  if (!customer) return fail("Customer not found.", 404);

  return ok(customer);
}

export async function PUT(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const customer = await resolveCustomer(params.id, session);
  if (!customer) return fail("Customer not found.", 404);

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const {
    firstName, lastName, phone, email, nationality,
    passportNumber, passportExpiry, dateOfBirth, tags,
  } = body;

  const updateData = {};
  if (firstName !== undefined) updateData.firstName = firstName?.trim();
  if (lastName  !== undefined) updateData.lastName  = lastName?.trim();
  if (phone     !== undefined) updateData.phone     = phone?.trim();
  if (email     !== undefined) updateData.email     = email?.trim() ?? null;
  if (nationality    !== undefined) updateData.nationality    = nationality;
  if (passportNumber !== undefined) updateData.passportNumber = passportNumber;
  if (passportExpiry !== undefined) updateData.passportExpiry = passportExpiry ? new Date(passportExpiry) : null;
  if (dateOfBirth    !== undefined) updateData.dateOfBirth    = dateOfBirth    ? new Date(dateOfBirth)    : null;
  if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];

  if (Object.keys(updateData).length === 0) return fail("No updatable fields provided.");

  const updated = await prisma.customer.update({ where: { id: params.id }, data: updateData });
  return ok(updated);
}

export async function DELETE(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER",
  ]);
  if (error) return error;

  const customer = await resolveCustomer(params.id, session);
  if (!customer) return fail("Customer not found.", 404);

  // Check for active bookings before deletion
  const activeBookings = await prisma.booking.count({
    where: { customerId: params.id, status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } },
  });
  if (activeBookings > 0) {
    return fail("Cannot delete customer with active bookings.", 409);
  }

  await prisma.customer.delete({ where: { id: params.id } });
  return ok({ deleted: true, id: params.id });
}
