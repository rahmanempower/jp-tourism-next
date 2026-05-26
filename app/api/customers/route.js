/**
 * GET  /api/customers   — list customers (agency-scoped)
 * POST /api/customers   — create customer (AGENCY_OWNER | AGENCY_STAFF)
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function GET(request) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page    = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit   = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip    = (page - 1) * limit;
  const search  = searchParams.get("search")?.trim();
  const stage   = searchParams.get("pipelineStage");

  const where = {};
  if (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") {
    where.agencyId = session.agencyId;
  }
  if (stage) where.pipelineStage = stage;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName:  { contains: search, mode: "insensitive" } },
      { email:     { contains: search, mode: "insensitive" } },
      { phone:     { contains: search } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { enquiries: true, bookings: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return ok(customers, { total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(request) {
  const { session, error } = await requireAuth(request, [
    "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { firstName, lastName, phone, email, nationality, passportNumber, passportExpiry, dateOfBirth, tags } = body;

  if (!firstName?.trim()) return fail("firstName is required.");
  if (!lastName?.trim())  return fail("lastName is required.");
  if (!phone?.trim())     return fail("phone is required.");

  const customer = await prisma.customer.create({
    data: {
      agencyId: session.agencyId,
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      phone:     phone.trim(),
      email:     email?.trim() ?? null,
      nationality: nationality ?? null,
      passportNumber: passportNumber ?? null,
      passportExpiry: passportExpiry ? new Date(passportExpiry) : null,
      dateOfBirth:    dateOfBirth    ? new Date(dateOfBirth)    : null,
      tags: Array.isArray(tags) ? tags : [],
      pipelineStage: "LEAD",
    },
  });

  return ok(customer, undefined, 201);
}
