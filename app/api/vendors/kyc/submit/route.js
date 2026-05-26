/**
 * POST /api/vendors/kyc/submit
 *
 * Vendor submits their KYC form (multipart/form-data).
 * Updates vendor business info and sets kycStatus → PENDING.
 * Accepts: bizInfo (JSON string) + doc_N_type / doc_N_file fields.
 *
 * Note: For production, replace the S3 upload stub with real signed POST logic.
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function POST(request) {
  const { session, error } = await requireAuth(request, ["VENDOR"]);
  if (error) return error;

  let formData;
  try { formData = await request.formData(); } catch { return fail("Expected multipart/form-data."); }

  let bizInfo;
  try {
    const raw = formData.get("bizInfo");
    if (!raw) return fail("bizInfo field is required.");
    bizInfo = JSON.parse(raw);
  } catch { return fail("bizInfo must be valid JSON."); }

  const { businessName, contactEmail, contactPhone } = bizInfo;
  if (!businessName?.trim()) return fail("businessName is required.");
  if (!contactEmail?.trim()) return fail("contactEmail is required.");
  if (!contactPhone?.trim()) return fail("contactPhone is required.");

  // Find vendor record owned by this user
  const vendor = await prisma.vendor.findFirst({ where: { users: { some: { id: session.id } } } });
  if (!vendor) return fail("No vendor profile found for this account.", 404);

  if (vendor.kycStatus === "APPROVED") {
    return fail("Vendor is already KYC approved.");
  }

  // Update vendor profile
  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      businessName: businessName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      kycStatus:    "PENDING",
    },
  });

  // TODO: process file uploads to S3 via createUploadPresignedPost
  // For now, acknowledge the submission. In production wire formData file fields
  // to lib/s3.js createUploadPresignedPost or use server-side buffer upload.

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: "KYC_SUBMITTED",
      entityType: "Vendor",
      entityId: vendor.id,
      newValue: { kycStatus: "PENDING", businessName },
    },
  });

  return ok({ submitted: true, vendorId: vendor.id, kycStatus: "PENDING" });
}
