// app/api/listings/route.js
// POST /api/listings — Vendor creates a new listing (starts as DRAFT)
// GET  /api/listings — Any authenticated user browses approved listings

import prisma from "@/lib/prisma.js";
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";

export async function GET(request) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const category = searchParams.get("category");
  const destinationCountry = searchParams.get("country");
  const status = searchParams.get("status");
  const vendorId = searchParams.get("vendorId");
  const minPrice = parseFloat(searchParams.get("minPrice") ?? "0") || undefined;
  const maxPrice = parseFloat(searchParams.get("maxPrice") ?? "0") || undefined;
  const maxSla = parseInt(searchParams.get("maxSla") ?? "0", 10) || undefined;

  // Non-admin users can only see APPROVED listings (unless vendor sees own)
  let allowedStatuses;
  if (["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    allowedStatuses = status ? [status] : undefined;
  } else if (session.role === "VENDOR") {
    allowedStatuses = status
      ? [status]
      : ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "ARCHIVED"];
  } else {
    allowedStatuses = ["APPROVED"];
  }

  const where = {};
  if (allowedStatuses) where.status = { in: allowedStatuses };
  if (category) where.category = category;
  if (destinationCountry) where.destinationCountry = destinationCountry;
  if (session.role === "VENDOR" && !vendorId) where.vendorId = session.vendorId;
  else if (vendorId) where.vendorId = vendorId;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.basePrice = {};
    if (minPrice !== undefined) where.basePrice.gte = minPrice;
    if (maxPrice !== undefined) where.basePrice.lte = maxPrice;
  }
  if (maxSla !== undefined) where.slaDays = { lte: maxSla };

  try {
    const [total, listings] = await Promise.all([
      prisma.serviceListing.count({ where }),
      prisma.serviceListing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          category: true,
          destinationCountry: true,
          basePrice: true,
          currency: true,
          slaDays: true,
          status: true,
          tags: true,
          vendor: { select: { id: true, businessName: true, slug: true, rating: true } },
          createdAt: true,
        },
      }),
    ]);

    return ok(listings, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[GET /api/listings]", err);
    return fail("Failed to fetch listings.", 500);
  }
}

export async function POST(request) {
  const { session, error } = await requireAuth(request, ["VENDOR", "SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  try {
    const body = await request.json();
    const {
      title,
      category,
      destinationCountry,
      inclusions,
      requiredDocuments,
      basePrice,
      refundablePercent,
      currency,
      slaDays,
      description,
      inventoryCount,
      tags,
    } = body;

    if (!title || !category || !destinationCountry || !basePrice || !slaDays) {
      return fail("title, category, destinationCountry, basePrice, and slaDays are required.");
    }

    const vendorId = session.role === "VENDOR" ? session.vendorId : body.vendorId;
    if (!vendorId) return fail("vendorId is required.");

    const listing = await prisma.serviceListing.create({
      data: {
        vendorId,
        title,
        category,
        destinationCountry,
        inclusions: inclusions ?? [],
        requiredDocuments: requiredDocuments ?? [],
        basePrice,
        refundablePercent: refundablePercent ?? 0,
        currency: currency ?? "USD",
        slaDays,
        status: "DRAFT",
        description: description ?? null,
        inventoryCount: inventoryCount ?? null,
        tags: tags ?? [],
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "LISTING_CREATED",
        entityType: "ServiceListing",
        entityId: listing.id,
        newValue: { title, category, status: "DRAFT" },
      },
    });

    return ok(listing, undefined, 201);
  } catch (err) {
    console.error("[POST /api/listings]", err);
    return fail("Failed to create listing.", 500);
  }
}
