// app/api/agencies/route.js
// POST /api/agencies — Admin creates an agency (optionally with owner user)
// GET  /api/agencies — Admin lists agencies

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma.js";
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
    return EMAIL_RE.test(String(value).trim());
}

function isFiniteNumber(value) {
    return Number.isFinite(value) && !Number.isNaN(value);
}

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

        const trimmedBusinessName = typeof businessName === "string" ? businessName.trim() : "";
        const trimmedContactEmail = typeof contactEmail === "string" ? contactEmail.trim() : "";
        const trimmedContactPhone = typeof contactPhone === "string" ? contactPhone.trim() : "";
        const trimmedLicenseNumber = typeof licenseNumber === "string" ? licenseNumber.trim() : "";
        const normalizedCreditLimit = Number(creditLimit);
        const normalizedMarginPercent = Number(marginPercent);

        if (!trimmedBusinessName || !trimmedContactEmail || !trimmedContactPhone || !trimmedLicenseNumber) {
            return fail("businessName, contactEmail, contactPhone, and licenseNumber are required.");
        }

        if (!isValidEmail(trimmedContactEmail)) {
            return fail("contactEmail is invalid.");
        }

        if (!isFiniteNumber(normalizedCreditLimit) || normalizedCreditLimit < 0) {
            return fail("creditLimit must be a valid non-negative number.");
        }

        if (!isFiniteNumber(normalizedMarginPercent) || normalizedMarginPercent < 0 || normalizedMarginPercent > 100) {
            return fail("marginPercent must be between 0 and 100.");
        }

        if (owner) {
            const ownerEmail = typeof owner.email === "string" ? owner.email.trim() : "";
            const ownerPassword = typeof owner.password === "string" ? owner.password : "";
            const ownerFirstName = typeof owner.firstName === "string" ? owner.firstName.trim() : "";
            const ownerLastName = typeof owner.lastName === "string" ? owner.lastName.trim() : "";

            if (!ownerEmail || !ownerPassword || !ownerFirstName || !ownerLastName) {
                return fail("owner.email, owner.password, owner.firstName, and owner.lastName are required when creating an owner user.");
            }
            if (!isValidEmail(ownerEmail)) {
                return fail("owner.email is invalid.");
            }
            if (ownerPassword.length < 8) {
                return fail("Password must be at least 8 characters.");
            }
            const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
            if (existingUser) {
                return fail("A user with that email already exists.", 409);
            }
        }

        const existingLicense = await prisma.agency.findUnique({ where: { licenseNumber: trimmedLicenseNumber } });
        if (existingLicense) {
            return fail("An agency with that license number already exists.", 409);
        }

        const baseSlug = trimmedBusinessName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        const slugExists = await prisma.agency.findUnique({ where: { slug: baseSlug } });
        const slug = slugExists ? `${baseSlug}-${Date.now()}` : baseSlug;

        const agency = await prisma.agency.create({
            data: {
                businessName: trimmedBusinessName,
                slug,
                licenseNumber: trimmedLicenseNumber,
                contactEmail: trimmedContactEmail,
                contactPhone: trimmedContactPhone,
                creditLimit: normalizedCreditLimit,
                marginPercent: normalizedMarginPercent,
                isActive: typeof isActive === "boolean" ? isActive : true,
            },
        });

        let user = null;
        if (owner) {
            const ownerEmail = typeof owner.email === "string" ? owner.email.trim() : "";
            const ownerPassword = typeof owner.password === "string" ? owner.password : "";
            const ownerFirstName = typeof owner.firstName === "string" ? owner.firstName.trim() : "";
            const ownerLastName = typeof owner.lastName === "string" ? owner.lastName.trim() : "";
            const ownerPhone = typeof owner.phone === "string" ? owner.phone.trim() : "";
            const passwordHash = await bcrypt.hash(ownerPassword, 12);
            user = await prisma.user.create({
                data: {
                    email: ownerEmail,
                    passwordHash,
                    role: "AGENCY_OWNER",
                    firstName: ownerFirstName,
                    lastName: ownerLastName,
                    phone: ownerPhone || null,
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
