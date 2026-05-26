// app/api/auth/register/route.js
// POST /api/auth/register — Register a new Agency or Vendor account.
// The created User starts as unverified; portal activation requires
// Admin approval for vendors or email verification for agencies.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma.js";

const ALLOWED_SELF_REGISTER_ROLES = ["AGENCY_OWNER", "VENDOR"];

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      businessName,
      contactPhone,
    } = body;

    // ─── Validation ─────────────────────────────────────────────────
    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { success: false, error: "email, password, firstName, lastName, and role are required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_SELF_REGISTER_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role for self-registration." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (role === "AGENCY_OWNER" && !businessName) {
      return NextResponse.json(
        { success: false, error: "businessName is required for Agency registration." },
        { status: 400 }
      );
    }

    if (role === "VENDOR" && (!businessName || !contactPhone)) {
      return NextResponse.json(
        { success: false, error: "businessName and contactPhone are required for Vendor registration." },
        { status: 400 }
      );
    }

    // ─── Duplicate check ────────────────────────────────────────────
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // ─── Create Agency or Vendor profile + User atomically ──────────
    let user;

    if (role === "AGENCY_OWNER") {
      const slug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Ensure slug uniqueness
      const slugExists = await prisma.agency.findUnique({ where: { slug } });
      const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

      const agency = await prisma.agency.create({
        data: {
          businessName,
          slug: finalSlug,
          contactEmail: email,
          contactPhone: phone ?? contactPhone ?? "",
          isActive: true,
        },
      });

      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "AGENCY_OWNER",
          firstName,
          lastName,
          phone,
          isActive: true,
          isEmailVerified: false,
          agencyId: agency.id,
        },
      });
    } else {
      // VENDOR
      const slug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const slugExists = await prisma.vendor.findUnique({ where: { slug } });
      const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

      const vendor = await prisma.vendor.create({
        data: {
          businessName,
          slug: finalSlug,
          contactEmail: email,
          contactPhone: contactPhone ?? phone ?? "",
          category: [],
          kycDocuments: [],
          kycStatus: "PENDING",
          isActive: false,
        },
      });

      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "VENDOR",
          firstName,
          lastName,
          phone,
          isActive: true,
          isEmailVerified: false,
          vendorId: vendor.id,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message:
          role === "VENDOR"
            ? "Vendor account created. Pending KYC approval."
            : "Agency account created. You can now log in.",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
