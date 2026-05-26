/**
 * GET  /api/wallet        — agency wallet balance + recent transactions
 * POST /api/wallet/recharge  — admin credits agency wallet
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

  // Admins may query any agency: ?agencyId=xxx
  let agencyId = session.agencyId;
  if (["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    agencyId = searchParams.get("agencyId") ?? agencyId;
  }

  if (!agencyId) return fail("agencyId is required.", 400);

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { id: true, businessName: true, walletBalance: true, creditLimit: true },
  });
  if (!agency) return fail("Agency not found.", 404);

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { agencyId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.walletTransaction.count({ where: { agencyId } }),
  ]);

  return ok({ agency, transactions }, { total, page, limit, pages: Math.ceil(total / limit) });
}
