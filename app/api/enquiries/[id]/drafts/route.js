/**
 * GET  /api/enquiries/[id]/drafts  — list draft packages for an enquiry
 * POST /api/enquiries/[id]/drafts  — create new draft package version
 *
 * Draft creation flow:
 *   Body: { title, items: [{ listingId, qty }], expiresAt? }
 *   - Fetches each listing (must be APPROVED, vendor ACTIVE)
 *   - Calculates vendorPrice, agencyMargin (from agency.marginPercent), totalPrice per item
 *   - Calculates subtotal, marginTotal, grandTotal
 *   - Automatically increments version per enquiry
 *   - Updates enquiry status → DRAFT_CREATED
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function GET(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const enquiry = await prisma.enquiry.findUnique({ where: { id: params.id } });
  if (!enquiry) return fail("Enquiry not found.", 404);

  if (
    (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") &&
    enquiry.agencyId !== session.agencyId
  ) {
    return fail("Enquiry not found.", 404);
  }

  const drafts = await prisma.draftPackage.findMany({
    where: { enquiryId: params.id },
    orderBy: { version: "desc" },
    include: {
      items: {
        include: {
          listing: {
            select: { id: true, title: true, category: true, vendorId: true, slaDays: true },
          },
        },
      },
    },
  });

  return ok(drafts);
}

export async function POST(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const enquiry = await prisma.enquiry.findUnique({ where: { id: params.id } });
  if (!enquiry) return fail("Enquiry not found.", 404);
  if (enquiry.agencyId !== session.agencyId) return fail("Enquiry not found.", 404);

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { title, items, expiresAt } = body;
  if (!title?.trim()) return fail("title is required.");
  if (!Array.isArray(items) || items.length === 0) return fail("items array is required.");

  // Validate & price each item
  const agency = await prisma.agency.findUnique({ where: { id: session.agencyId } });
  const marginPercent = agency.marginPercent ?? 2;

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

  // Totals
  const subtotal    = parseFloat(pricedItems.reduce((s, i) => s + i.vendorPrice * i.qty, 0).toFixed(2));
  const marginTotal = parseFloat(pricedItems.reduce((s, i) => s + i.agencyMargin * i.qty, 0).toFixed(2));
  const grandTotal  = parseFloat((subtotal + marginTotal).toFixed(2));

  // Next version number for this enquiry
  const lastDraft = await prisma.draftPackage.findFirst({
    where: { enquiryId: params.id },
    orderBy: { version: "desc" },
  });
  const version = (lastDraft?.version ?? 0) + 1;

  const draft = await prisma.draftPackage.create({
    data: {
      enquiryId: params.id,
      agencyId: session.agencyId,
      version,
      title: title.trim(),
      subtotal,
      marginTotal,
      grandTotal,
      status: "DRAFT",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      items: {
        create: pricedItems,
      },
    },
    include: { items: { include: { listing: { select: { id: true, title: true } } } } },
  });

  // Update enquiry status
  await prisma.enquiry.update({
    where: { id: params.id },
    data: { status: "DRAFT_CREATED" },
  });

  return ok(draft, undefined, 201);
}
