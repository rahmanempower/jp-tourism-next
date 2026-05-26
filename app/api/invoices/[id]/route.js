/**
 * GET   /api/invoices/[id]         — invoice detail with payments
 * PATCH /api/invoices/[id]         — update invoice (DRAFT only; title/items/dueAt)
 * PATCH /api/invoices/[id]/issue   — issue invoice (DRAFT → ISSUED)
 * PATCH /api/invoices/[id]/cancel  — void invoice
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

async function resolveInvoice(id, session) {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true, agency: { select: { id: true, businessName: true } } },
  });
  if (!inv) return null;
  if (
    (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") &&
    inv.agencyId !== session.agencyId
  ) {
    return null;
  }
  return inv;
}

export async function GET(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const inv = await resolveInvoice(params.id, session);
  if (!inv) return fail("Invoice not found.", 404);

  return ok(inv);
}

export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER",
  ]);
  if (error) return error;

  const inv = await resolveInvoice(params.id, session);
  if (!inv) return fail("Invoice not found.", 404);
  if (inv.status !== "DRAFT") return fail("Only DRAFT invoices can be edited.");

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { lineItems, taxAmount, dueAt, status } = body;

  if (status && !["CANCELLED"].includes(status)) {
    return fail("Use /issue endpoint to issue an invoice.");
  }

  const updateData = {};
  if (lineItems) {
    const subtotal = lineItems.reduce((sum, li) => sum + (li.total ?? 0), 0);
    const tax      = taxAmount != null ? parseFloat(taxAmount.toFixed(2)) : inv.taxAmount;
    const total    = parseFloat((subtotal + tax).toFixed(2));
    updateData.lineItems   = lineItems;
    updateData.subtotal    = parseFloat(subtotal.toFixed(2));
    updateData.taxAmount   = tax;
    updateData.totalAmount = total;
    updateData.dueAmount   = total - inv.paidAmount;
  }
  if (dueAt !== undefined) updateData.dueAt = dueAt ? new Date(dueAt) : null;
  if (status === "CANCELLED") updateData.status = "CANCELLED";

  if (Object.keys(updateData).length === 0) return fail("No updatable fields provided.");

  const updated = await prisma.invoice.update({ where: { id: params.id }, data: updateData });
  return ok(updated);
}
