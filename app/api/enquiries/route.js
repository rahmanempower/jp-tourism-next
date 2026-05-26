/**
 * GET  /api/enquiries  — list enquiries (agency-scoped, admin sees all)
 * POST /api/enquiries  — create a new enquiry (AGENCY_OWNER | AGENCY_STAFF)
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function GET(request) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip  = (page - 1) * limit;
  const status = searchParams.get("status");   // optional filter

  // Admin/super-admin see all; agency roles see own
  const where = {};
  if (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") {
    where.agencyId = session.agencyId;
  }
  if (status) where.status = status;

  const [enquiries, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        _count: { select: { draftPackages: true } },
      },
    }),
    prisma.enquiry.count({ where }),
  ]);

  return ok(enquiries, { total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(request) {
  const { session, error } = await requireAuth(request, [
    "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { title, notes, customerId } = body;
  if (!title?.trim()) return fail("title is required.");

  // Validate customerId belongs to same agency if provided
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, agencyId: session.agencyId },
    });
    if (!customer) return fail("Customer not found.", 404);
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      agencyId: session.agencyId,
      customerId: customerId ?? null,
      title: title.trim(),
      notes: notes?.trim() ?? null,
      status: "OPEN",
      createdBy: session.id,
    },
  });

  return ok(enquiry, undefined, 201);
}
