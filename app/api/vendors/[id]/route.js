// app/api/vendors/[id]/route.js
// GET /api/vendors/:id  — Admin or own Vendor
// PUT /api/vendors/:id  — Admin or own Vendor (update profile)

import prisma from "@/lib/prisma.js";
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";

function canAccessVendor(session, vendorId) {
  if (["SUPER_ADMIN", "ADMIN"].includes(session.role)) return true;
  if (session.role === "VENDOR" && session.vendorId === vendorId) return true;
  return false;
}

export async function GET(request, { params }) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  if (!canAccessVendor(session, id)) return fail("Forbidden.", 403);

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        _count: { select: { listings: true, bookings: true } },
      },
    });

    if (!vendor) return fail("Vendor not found.", 404);
    return ok(vendor);
  } catch (err) {
    console.error("[GET /api/vendors/:id]", err);
    return fail("Failed to fetch vendor.", 500);
  }
}

export async function PUT(request, { params }) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  if (!canAccessVendor(session, id)) return fail("Forbidden.", 403);

  try {
    const body = await request.json();
    const { businessName, contactEmail, contactPhone, category, address, bankDetails } = body;

    // Only admin can update bank details
    const updateData = {};
    if (businessName) updateData.businessName = businessName;
    if (contactEmail) updateData.contactEmail = contactEmail;
    if (contactPhone) updateData.contactPhone = contactPhone;
    if (category) updateData.category = category;
    if (address !== undefined) updateData.address = address;
    if (bankDetails && ["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
      updateData.bankDetails = bankDetails;
    }

    const vendor = await prisma.vendor.update({ where: { id }, data: updateData });
    return ok(vendor);
  } catch (err) {
    if (err.code === "P2025") return fail("Vendor not found.", 404);
    console.error("[PUT /api/vendors/:id]", err);
    return fail("Failed to update vendor.", 500);
  }
}
