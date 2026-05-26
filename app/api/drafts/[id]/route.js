/**
 * GET  /api/drafts/[id]  — full draft detail with margin breakdown
 * PUT  /api/drafts/[id]  — update draft (title, items, expiresAt) while DRAFT status
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

async function resolveDraft(id, session) {
  const draft = await prisma.draftPackage.findUnique({
    where: { id },
    include: {
      enquiry: { select: { id: true, title: true, status: true, customerId: true } },
      items: {
        include: {
          listing: {
            select: {
              id: true, title: true, category: true, destinationCountry: true,
              slaDays: true, currency: true, vendorId: true,
            },
          },
        },
      },
    },
  });
  if (!draft) return null;

  if (
    (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") &&
    draft.agencyId !== session.agencyId
  ) {
    return null;
  }
  return draft;
}

export async function GET(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const draft = await resolveDraft(params.id, session);
  if (!draft) return fail("Draft not found.", 404);

  return ok(draft);
}

export async function PUT(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const draft = await resolveDraft(params.id, session);
  if (!draft) return fail("Draft not found.", 404);
  if (draft.status !== "DRAFT") return fail("Only DRAFT status packages can be edited.");

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { title, items, expiresAt } = body;

  const agency = await prisma.agency.findUnique({ where: { id: session.agencyId } });
  const marginPercent = agency.marginPercent ?? 2;

  let updateData = {};
  if (title) updateData.title = title.trim();
  if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

  if (Array.isArray(items) && items.length > 0) {
    const pricedItems = [];
    for (const item of items) {
      if (!item.listingId || !item.qty || item.qty < 1) {
        return fail("Each item needs listingId and qty ≥ 1.");
      }
      const listing = await prisma.serviceListing.findFirst({
        where: { id: item.listingId, status: "APPROVED" },
        include: { vendor: { select: { isActive: true } } },
      });
      if (!listing) return fail(`Listing ${item.listingId} not found or not approved.`, 404);
      if (!listing.vendor.isActive) return fail(`Vendor for listing ${item.listingId} is inactive.`);

      const vendorPrice  = listing.basePrice;
      const agencyMargin = parseFloat((vendorPrice * marginPercent / 100).toFixed(2));
      const totalPrice   = parseFloat(((vendorPrice + agencyMargin) * item.qty).toFixed(2));
      pricedItems.push({ listingId: item.listingId, qty: item.qty, vendorPrice, agencyMargin, totalPrice });
    }

    const subtotal    = parseFloat(pricedItems.reduce((s, i) => s + i.vendorPrice * i.qty, 0).toFixed(2));
    const marginTotal = parseFloat(pricedItems.reduce((s, i) => s + i.agencyMargin * i.qty, 0).toFixed(2));
    const grandTotal  = parseFloat((subtotal + marginTotal).toFixed(2));

    // Replace all items
    await prisma.packageItems.deleteMany({ where: { draftPackageId: params.id } });
    Object.assign(updateData, { subtotal, marginTotal, grandTotal, items: { create: pricedItems } });
  }

  const updated = await prisma.draftPackage.update({
    where: { id: params.id },
    data: updateData,
    include: { items: { include: { listing: { select: { id: true, title: true } } } } },
  });

  return ok(updated);
}
