// app/api/listings/[id]/route.js
// GET    /api/listings/:id  — any authenticated user
// PUT    /api/listings/:id  — Vendor (own) or Admin
// DELETE /api/listings/:id  — Vendor (own) or Admin (archives)

import prisma from "@/lib/prisma.js";
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";

function canEditListing(session, listing) {
  if (["SUPER_ADMIN", "ADMIN"].includes(session.role)) return true;
  if (session.role === "VENDOR" && listing.vendorId === session.vendorId) return true;
  return false;
}

export async function GET(request, { params }) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;

  try {
    const listing = await prisma.serviceListing.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, businessName: true, slug: true, rating: true, contactEmail: true } },
      },
    });

    if (!listing) return fail("Listing not found.", 404);

    // Non-admin, non-vendor-owner can only see APPROVED listings
    const isOwnVendor = session.role === "VENDOR" && listing.vendorId === session.vendorId;
    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(session.role);
    if (!isAdmin && !isOwnVendor && listing.status !== "APPROVED") {
      return fail("Listing not found.", 404);
    }

    return ok(listing);
  } catch (err) {
    console.error("[GET /api/listings/:id]", err);
    return fail("Failed to fetch listing.", 500);
  }
}

export async function PUT(request, { params }) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.serviceListing.findUnique({ where: { id } });
    if (!existing) return fail("Listing not found.", 404);
    if (!canEditListing(session, existing)) return fail("Forbidden.", 403);

    const body = await request.json();
    const {
      title, description, inclusions, requiredDocuments,
      basePrice, refundablePercent, currency, slaDays,
      destinationCountry, inventoryCount, tags, category,
    } = body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (inclusions) updateData.inclusions = inclusions;
    if (requiredDocuments) updateData.requiredDocuments = requiredDocuments;
    if (basePrice) updateData.basePrice = basePrice;
    if (refundablePercent !== undefined) updateData.refundablePercent = refundablePercent;
    if (currency) updateData.currency = currency;
    if (slaDays) updateData.slaDays = slaDays;
    if (destinationCountry) updateData.destinationCountry = destinationCountry;
    if (inventoryCount !== undefined) updateData.inventoryCount = inventoryCount;
    if (tags) updateData.tags = tags;
    if (category) updateData.category = category;

    // Reset to PENDING_APPROVAL on any vendor edit of an APPROVED listing
    if (session.role === "VENDOR" && existing.status === "APPROVED") {
      updateData.status = "PENDING_APPROVAL";
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    }

    const updated = await prisma.serviceListing.update({ where: { id }, data: updateData });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "LISTING_UPDATED",
        entityType: "ServiceListing",
        entityId: id,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
      },
    });

    return ok(updated);
  } catch (err) {
    console.error("[PUT /api/listings/:id]", err);
    return fail("Failed to update listing.", 500);
  }
}

export async function DELETE(request, { params }) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.serviceListing.findUnique({ where: { id } });
    if (!existing) return fail("Listing not found.", 404);
    if (!canEditListing(session, existing)) return fail("Forbidden.", 403);

    // Soft delete — archive
    const updated = await prisma.serviceListing.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "LISTING_ARCHIVED",
        entityType: "ServiceListing",
        entityId: id,
      },
    });

    return ok({ id: updated.id, status: updated.status });
  } catch (err) {
    console.error("[DELETE /api/listings/:id]", err);
    return fail("Failed to archive listing.", 500);
  }
}
