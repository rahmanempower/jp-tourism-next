// app/api/vendors/[id]/status/route.js
// PATCH /api/vendors/:id/status — Admin activates or deactivates vendor

import prisma from "@/lib/prisma.js";
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";

export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(request, ["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const { id } = await params;

  try {
    const { isActive } = await request.json();

    if (typeof isActive !== "boolean") {
      return fail("isActive (boolean) is required.");
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { isActive },
      select: { id: true, businessName: true, isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: isActive ? "VENDOR_ACTIVATED" : "VENDOR_DEACTIVATED",
        entityType: "Vendor",
        entityId: id,
        newValue: { isActive },
      },
    });

    return ok(vendor);
  } catch (err) {
    if (err.code === "P2025") return fail("Vendor not found.", 404);
    console.error("[PATCH /api/vendors/:id/status]", err);
    return fail("Failed to update vendor status.", 500);
  }
}
