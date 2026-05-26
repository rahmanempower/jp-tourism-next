// app/api/vendors/[id]/kyc/documents/route.js
// POST /api/vendors/:id/kyc/documents
// Vendor registers a KYC document reference after uploading to S3.
// (Actual S3 presign lives at /api/documents/presign)

import prisma from "@/lib/prisma.js";
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";

export async function POST(request, { params }) {
  const { session, error } = await requireAuth(request, ["VENDOR", "SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const { id } = await params;

  // Vendor can only modify their own profile
  if (session.role === "VENDOR" && session.vendorId !== id) {
    return fail("Forbidden.", 403);
  }

  try {
    const { key, type } = await request.json();

    if (!key || !type) return fail("key and type are required.");

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return fail("Vendor not found.", 404);

    const newDoc = { key, type, uploadedAt: new Date().toISOString() };
    const updatedDocs = [...(vendor.kycDocuments ?? []), newDoc];

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        kycDocuments: updatedDocs,
        kycStatus: vendor.kycStatus === "PENDING" ? "UNDER_REVIEW" : vendor.kycStatus,
      },
    });

    return ok({ kycDocuments: updated.kycDocuments, kycStatus: updated.kycStatus });
  } catch (err) {
    console.error("[POST /api/vendors/:id/kyc/documents]", err);
    return fail("Failed to register KYC document.", 500);
  }
}
