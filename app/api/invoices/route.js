/**
 * GET  /api/invoices   — list invoices (agency-scoped; admin sees all)
 * POST /api/invoices   — create invoice (AGENCY_OWNER | ADMIN)
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `INV-${year}-${rand}`;
}

export async function GET(request) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip   = (page - 1) * limit;
  const status = searchParams.get("status");
  const type   = searchParams.get("type");

  const where = {};
  if (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") {
    where.agencyId = session.agencyId;
  }
  if (status) where.status = status;
  if (type)   where.type   = type;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { agency: { select: { id: true, businessName: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);

  return ok(invoices, { total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(request) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER",
  ]);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { agencyId: reqAgencyId, bookingId, type, lineItems, taxAmount, dueAt } = body;

  const agencyId = (session.role === "AGENCY_OWNER") ? session.agencyId : reqAgencyId;
  if (!agencyId) return fail("agencyId is required.");
  if (!type)     return fail("type is required (PROFORMA | TAX | CREDIT_NOTE).");
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return fail("lineItems must be a non-empty array.");
  }

  const subtotal = lineItems.reduce((sum, li) => sum + (li.total ?? 0), 0);
  const tax      = parseFloat((taxAmount ?? 0).toFixed(2));
  const total    = parseFloat((subtotal + tax).toFixed(2));

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: nextInvoiceNumber(),
      agencyId,
      bookingId: bookingId ?? null,
      type,
      lineItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxAmount: tax,
      totalAmount: total,
      dueAmount: total,
      paidAmount: 0,
      status: "DRAFT",
      dueAt: dueAt ? new Date(dueAt) : null,
    },
  });

  return ok(invoice, undefined, 201);
}
