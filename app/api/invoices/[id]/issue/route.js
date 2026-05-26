/**
 * PATCH /api/invoices/[id]/issue
 * Issues a DRAFT invoice → sets status ISSUED and records issuedAt.
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER",
  ]);
  if (error) return error;

  const inv = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!inv) return fail("Invoice not found.", 404);

  if (
    (session.role === "AGENCY_OWNER") &&
    inv.agencyId !== session.agencyId
  ) return fail("Invoice not found.", 404);

  if (inv.status !== "DRAFT") return fail("Only DRAFT invoices can be issued.");

  const updated = await prisma.invoice.update({
    where: { id: params.id },
    data: { status: "ISSUED", issuedAt: new Date() },
  });

  return ok(updated);
}
