// app/api/vendors/[id]/kyc/route.js
// PATCH /api/vendors/:id/kyc — Admin approves or rejects KYC
// POST  /api/vendors/:id/kyc/documents — Vendor uploads KYC document reference

import prisma from "@/lib/prisma.js";
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";

export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(request, ["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const { id } = await params;

  try {
    const { kycStatus, reason } = await request.json();

    const validStatuses = ["UNDER_REVIEW", "APPROVED", "REJECTED"];
    if (!validStatuses.includes(kycStatus)) {
      return fail(`kycStatus must be one of: ${validStatuses.join(", ")}.`);
    }

    const data = { kycStatus };
    if (kycStatus === "APPROVED") data.isActive = true;
    if (kycStatus === "REJECTED") data.isActive = false;

    const vendor = await prisma.vendor.update({ where: { id }, data });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: `VENDOR_KYC_${kycStatus}`,
        entityType: "Vendor",
        entityId: id,
        newValue: { kycStatus, reason: reason ?? null },
      },
    });

    return ok({ id: vendor.id, kycStatus: vendor.kycStatus, isActive: vendor.isActive });
  } catch (err) {
    if (err.code === "P2025") return fail("Vendor not found.", 404);
    console.error("[PATCH /api/vendors/:id/kyc]", err);
    return fail("Failed to update KYC status.", 500);
  }
}
