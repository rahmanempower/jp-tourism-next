/**
 * GET   /api/notifications          — list user's notifications (paginated)
 * PATCH /api/notifications/read-all — mark all as read
 */
import { requireAuth, ok, fail } from "@/lib/apiAuth.js";
import prisma from "@/lib/prisma.js";

export async function GET(request) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page    = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit   = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip    = (page - 1) * limit;
  const unread  = searchParams.get("unread") === "true";

  const where = { userId: session.id };
  if (unread) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session.id, isRead: false } }),
  ]);

  return ok({ notifications, unreadCount }, { total, page, limit, pages: Math.ceil(total / limit) });
}
