// app/api/vendors/route.js
// POST /api/vendors  — Admin creates a vendor profile (optionally with owner user)
// GET  /api/vendors  — Admin lists vendors with optional kycStatus filter

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma.js";
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";

export async function GET(request) {
  const { session, error } = await requireAuth(request, ["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const kycStatus = searchParams.get("kycStatus");
  const isActive = searchParams.get("isActive");

  const where = {};
  if (kycStatus) where.kycStatus = kycStatus;
  if (isActive !== null && isActive !== undefined) where.isActive = isActive === "true";

  try {
    const [total, vendors] = await Promise.all([
      prisma.vendor.count({ where }),
      prisma.vendor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          businessName: true,
          slug: true,
          category: true,
          kycStatus: true,
          contactEmail: true,
          contactPhone: true,
          isActive: true,
          rating: true,
          slaBreachCount: true,
          createdAt: true,
        },
      }),
    ]);

    return ok(vendors, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[GET /api/vendors]", err);
    return fail("Failed to fetch vendors.", 500);
  }
}

export async function POST(request) {
  const { session, error } = await requireAuth(request, ["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  try {
    const body = await request.json();
    const {
      businessName,
      contactEmail,
      contactPhone,
      category,
      address,
      owner, // optional: { email, password, firstName, lastName, phone? }
    } = body;

    if (!businessName || !contactEmail || !contactPhone) {
      return fail("businessName, contactEmail, and contactPhone are required.");
    }

    if (owner) {
      const { email, password, firstName, lastName } = owner;
      if (!email || !password || !firstName || !lastName) {
        return fail("owner.email, owner.password, owner.firstName, and owner.lastName are required when creating an owner user.");
      }
      if (password.length < 8) {
        return fail("Password must be at least 8 characters.");
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return fail("A user with that email already exists.", 409);
      }
    }

    const baseSlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slugExists = await prisma.vendor.findUnique({ where: { slug: baseSlug } });
    const slug = slugExists ? `${baseSlug}-${Date.now()}` : baseSlug;

    const vendor = await prisma.vendor.create({
      data: {
        businessName,
        slug,
        contactEmail,
        contactPhone,
        category: Array.isArray(category) ? category : [],
        kycDocuments: [],
        kycStatus: "PENDING",
        isActive: false,
        address: address ?? null,
      },
    });

    let user = null;
    if (owner) {
      const passwordHash = await bcrypt.hash(owner.password, 12);
      user = await prisma.user.create({
        data: {
          email: owner.email,
          passwordHash,
          role: "VENDOR",
          firstName: owner.firstName,
          lastName: owner.lastName,
          phone: owner.phone ?? null,
          isActive: true,
          isEmailVerified: false,
          vendorId: vendor.id,
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });
    }

    return ok({ vendor, user }, undefined, 201);
  } catch (err) {
    console.error("[POST /api/vendors]", err);
    return fail("Failed to create vendor.", 500);
  }
}
