/**
 * POST /api/wallet/recharge
 *
 * Admin credits an agency wallet. Creates a CREDIT WalletTransaction
 * and updates Agency.walletBalance atomically.
 *
 * Body: { agencyId, amount, description? }
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function POST(request) {
  const { session, error } = await requireAuth(request, ["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { agencyId, amount, description } = body;
  if (!agencyId) return fail("agencyId is required.");
  if (!amount || isNaN(amount) || amount <= 0) return fail("amount must be a positive number.");

  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) return fail("Agency not found.", 404);

  const credit = parseFloat(parseFloat(amount).toFixed(2));
  const newBalance = parseFloat((agency.walletBalance + credit).toFixed(2));

  await prisma.$transaction(async (tx) => {
    await tx.agency.update({
      where: { id: agencyId },
      data: { walletBalance: newBalance },
    });

    await tx.walletTransaction.create({
      data: {
        agencyId,
        type: "CREDIT",
        amount: credit,
        balanceBefore: agency.walletBalance,
        balanceAfter: newBalance,
        referenceType: "Recharge",
        description: description?.trim() ?? `Manual top-up by admin`,
        status: "COMPLETED",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.id,
        action: "WALLET_RECHARGED",
        entityType: "Agency",
        entityId: agencyId,
        oldValue: { walletBalance: agency.walletBalance },
        newValue: { walletBalance: newBalance, credited: credit },
      },
    });
  });

  return ok({ agencyId, credited: credit, newBalance });
}
