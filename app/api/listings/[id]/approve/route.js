// app/api/listings/[id]/approve/route.js
// PATCH /api/listings/:id/approve — Admin approves or rejects a listing

import prisma from "@/lib/prisma.js";
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";

export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(request, ["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const { id } = await params;

  try {
    const { action, note } = await request.json(); // action: "approve" | "reject"

    if (!["approve", "reject"].includes(action)) {
      return fail('action must be "approve" or "reject".');
    }

    const listing = await prisma.serviceListing.findUnique({ where: { id } });
    if (!listing) return fail("Listing not found.", 404);
    if (listing.status !== "PENDING_APPROVAL" && listing.status !== "DRAFT") {
      return fail("Only DRAFT or PENDING_APPROVAL listings can be reviewed.");
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const updated = await prisma.serviceListing.update({
      where: { id },
      data: {
        status: newStatus,
        approvedBy: action === "approve" ? session.id : null,
        approvedAt: action === "approve" ? new Date() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: action === "approve" ? "LISTING_APPROVED" : "LISTING_REJECTED",
        entityType: "ServiceListing",
        entityId: id,
        oldValue: { status: listing.status },
        newValue: { status: newStatus, note: note ?? null },
      },
    });

    return ok({ id: updated.id, status: updated.status });
  } catch (err) {
    console.error("[PATCH /api/listings/:id/approve]", err);
    return fail("Failed to review listing.", 500);
  }
}
