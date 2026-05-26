/**
 * PATCH /api/customers/[id]/pipeline
 *
 * Advances the customer's CRM pipeline stage.
 * Allowed stages: LEAD → ENQUIRY → BOOKING → PROCESSING → COMPLETED
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

const STAGES = ["LEAD", "ENQUIRY", "BOOKING", "PROCESSING", "COMPLETED"];

export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(request, [
    "SUPER_ADMIN", "ADMIN", "AGENCY_OWNER", "AGENCY_STAFF",
  ]);
  if (error) return error;

  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) return fail("Customer not found.", 404);

  if (
    (session.role === "AGENCY_OWNER" || session.role === "AGENCY_STAFF") &&
    customer.agencyId !== session.agencyId
  ) {
    return fail("Customer not found.", 404);
  }

  let body;
  try { body = await request.json(); } catch { return fail("Invalid JSON."); }

  const { pipelineStage } = body;
  if (!pipelineStage) return fail("pipelineStage is required.");
  if (!STAGES.includes(pipelineStage)) {
    return fail(`Invalid pipelineStage. Allowed: ${STAGES.join(", ")}`);
  }

  const updated = await prisma.customer.update({
    where: { id: params.id },
    data: { pipelineStage },
  });

  return ok(updated);
}
