/**
 * GET   /api/enquiries/[id]   — enquiry detail
 * PATCH /api/enquiries/[id]   — update status / notes
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

async function resolveEnquiry(id, session) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
    include: {
      customer: true,
      draftPackages: {
        orderBy: { version: "desc" },
        include: { items: { include: { listing: { select: { id: true, title: true, basePrice: true } } } } },
      },
    },
  });
  if (!enquiry) return null;

  // Agency users can only see their own
  if (
    (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") &&
    enquiry.agencyId !== session.agencyId
  ) {
    return null;
  }
  return enquiry;
}

export async function GET(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const enquiry = await resolveEnquiry(params.id, session);
  if (!enquiry) return fail("Enquiry not found.", 404);

  return ok(enquiry);
}

export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const enquiry = await resolveEnquiry(params.id, session);
  if (!enquiry) return fail("Enquiry not found.", 404);

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const ALLOWED_STATUSES = ["OPEN", "DRAFT_CREATED", "QUOTED", "CONVERTED", "LOST"];
  const { status, notes } = body;

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return fail(`Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}`);
  }

  const updated = await prisma.enquiry.update({
    where: { id: params.id },
    data: {
      ...(status ? { status } : {}),
      ...(notes !== undefined ? { notes: notes?.trim() ?? null } : {}),
    },
  });

  return ok(updated);
}
