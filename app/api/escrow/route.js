/**
 * GET  /api/escrow         — list escrow records (admin sees all; vendor sees own)
 * POST /api/escrow/[id]/release — admin releases escrow to vendor on booking completion
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function GET(request) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "VENDOR",
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip   = (page - 1) * limit;
  const status = searchParams.get("status");

  const where = {};
  if (session.role === "VENDOR") where.vendorId = session.vendorId;
  if (status) where.status = status;

  const [records, total] = await Promise.all([
    prisma.escrowLedger.findMany({
      where,
      skip,
      take: limit,
      orderBy: { heldAt: "desc" },
      include: {
        booking: { select: { id: true, bookingRef: true, status: true } },
        agency:  { select: { id: true, businessName: true } },
        vendor:  { select: { id: true, businessName: true } },
      },
    }),
    prisma.escrowLedger.count({ where }),
  ]);

  return ok(records, { total, page, limit, pages: Math.ceil(total / limit) });
}
