// app/api/agencies/route.js
// POST /api/agencies — Admin creates an agency (optionally with owner user)
// GET  /api/agencies — Admin lists agencies

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma.js";
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";

export async function GET(request) {
    const { error } = await requireAuth(request, ["SUPER_ADMIN", "ADMIN"]);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const isActive = searchParams.get("isActive");

    const where = {};
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === "true";

    try {
        const [total, agencies] = await Promise.all([
            prisma.agency.count({ where }),
            prisma.agency.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    businessName: true,
                    slug: true,
                    licenseNumber: true,
                    contactEmail: true,
                    contactPhone: true,
                    walletBalance: true,
                    creditLimit: true,
                    marginPercent: true,
                    isActive: true,
                    createdAt: true,
                },
            }),
        ]);

        return ok(agencies, { total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        console.error("[GET /api/agencies]", err);
        return fail("Failed to fetch agencies.", 500);
    }
}

export async function POST(request) {
    const { error } = await requireAuth(request, ["SUPER_ADMIN", "ADMIN"]);
    if (error) return error;

    try {
        const body = await request.json();
        const {
            businessName,
            contactEmail,
            contactPhone,
            licenseNumber,
            creditLimit,
            marginPercent,
            isActive,
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
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return fail("A user with that email already exists.", 409);
            }
        }

        if (licenseNumber) {
            const existingLicense = await prisma.agency.findUnique({ where: { licenseNumber } });
            if (existingLicense) {
                return fail("An agency with that license number already exists.", 409);
            }
        }

        const baseSlug = businessName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        const slugExists = await prisma.agency.findUnique({ where: { slug: baseSlug } });
        const slug = slugExists ? `${baseSlug}-${Date.now()}` : baseSlug;

        const agency = await prisma.agency.create({
            data: {
                businessName,
                slug,
                licenseNumber: licenseNumber ?? null,
                contactEmail,
                contactPhone,
                creditLimit: typeof creditLimit === "number" ? creditLimit : 0,
                marginPercent: typeof marginPercent === "number" ? marginPercent : 2,
                isActive: typeof isActive === "boolean" ? isActive : true,
            },
        });

        let user = null;
        if (owner) {
            const passwordHash = await bcrypt.hash(owner.password, 12);
            user = await prisma.user.create({
                data: {
                    email: owner.email,
                    passwordHash,
                    role: "AGENCY_OWNER",
                    firstName: owner.firstName,
                    lastName: owner.lastName,
                    phone: owner.phone ?? null,
                    isActive: true,
                    isEmailVerified: false,
                    agencyId: agency.id,
                },
                select: { id: true, email: true, firstName: true, lastName: true, role: true },
            });
        }

        return ok({ agency, user }, undefined, 201);
    } catch (err) {
        console.error("[POST /api/agencies]", err);
        return fail("Failed to create agency.", 500);
    }
}
