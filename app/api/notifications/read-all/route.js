/**
 * PATCH /api/notifications/read-all
 * Marks all of the current user's notifications as read.
 */
import { requireAuth, ok } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function PATCH(request) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { count } = await prisma.notification.updateMany({
    where: { userId: session.id, isRead: false },
    data: { isRead: true },
  });

  return ok({ markedRead: count });
}
