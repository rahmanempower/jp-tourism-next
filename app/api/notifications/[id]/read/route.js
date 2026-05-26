/**
 * PATCH /api/notifications/[id]/read
 * Marks a single notification as read.
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const notif = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!notif || notif.userId !== session.id) return fail("Notification not found.", 404);

  const updated = await prisma.notification.update({
    where: { id: params.id },
    data: { isRead: true },
  });

  return ok(updated);
}
