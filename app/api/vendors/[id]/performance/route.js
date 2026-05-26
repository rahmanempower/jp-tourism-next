// app/api/vendors/[id]/performance/route.js
// GET /api/vendors/:id/performance — SLA metrics, breach count, ratings.

import prisma from "@/lib/prisma.js";
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";

export async function GET(request, { params }) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;

  const isAdminOrOwn =
    ["SUPER_ADMIN", "ADMIN"].includes(session.role) ||
    (session.role === "VENDOR" && session.vendorId === id);

  if (!isAdminOrOwn) return fail("Forbidden.", 403);

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true, businessName: true, rating: true, slaBreachCount: true },
    });

    if (!vendor) return fail("Vendor not found.", 404);

    // Compute booking stats
    const [total, completed, cancelled, slaBreached] = await Promise.all([
      prisma.booking.count({ where: { vendorId: id } }),
      prisma.booking.count({ where: { vendorId: id, status: "COMPLETED" } }),
      prisma.booking.count({ where: { vendorId: id, status: "CANCELLED" } }),
      vendor.slaBreachCount,
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return ok({
      vendorId: id,
      businessName: vendor.businessName,
      rating: vendor.rating,
      slaBreachCount: slaBreached,
      bookings: { total, completed, cancelled, completionRate },
    });
  } catch (err) {
    console.error("[GET /api/vendors/:id/performance]", err);
    return fail("Failed to fetch performance data.", 500);
  }
}
