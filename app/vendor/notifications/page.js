// app/vendor/notifications/page.js — Vendor Notifications
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Notifications · Vendor · JP Tourism" };

const TYPE_COLORS = {
  BOOKING: "#6366f1",
  DOCUMENT: "#06b6d4",
  PAYMENT: "#22c55e",
  STATUS_CHANGE: "#f59e0b",
  SYSTEM: "#6b7280",
};

const TYPE_ICONS = {
  BOOKING: "pi pi-calendar",
  DOCUMENT: "pi pi-file",
  PAYMENT: "pi pi-wallet",
  STATUS_CHANGE: "pi pi-refresh",
  SYSTEM: "pi pi-cog",
};

const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function VendorNotificationsPage() {
  const session = await getSession();
  if (!session?.id) return null;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({ where: { userId: session.id } }),
    prisma.notification.count({ where: { userId: session.id, isRead: false } }),
  ]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Notifications</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {total.toLocaleString()} total ·{" "}
            <span style={{ color: unreadCount > 0 ? "#f59e0b" : "var(--text-muted)", fontWeight: unreadCount > 0 ? 600 : 400 }}>
              {unreadCount} unread
            </span>
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {notifications.map((n) => {
          const color = TYPE_COLORS[n.type] ?? "#6b7280";
          const icon = TYPE_ICONS[n.type] ?? "pi pi-bell";
          return (
            <div
              key={n.id}
              style={{
                background: n.isRead ? "var(--card-bg)" : `${color}10`,
                border: `1px solid ${n.isRead ? "var(--card-border)" : `${color}33`}`,
                borderLeft: `3px solid ${n.isRead ? "var(--card-border)" : color}`,
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <i className={icon} style={{ color, fontSize: "0.95rem" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, color: n.isRead ? "var(--text-secondary)" : "var(--text-primary)", fontSize: "0.9rem" }}>
                    {n.title}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {!n.isRead && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                    )}
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{fmt(n.createdAt)}</span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{n.message}</p>
                <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.72rem", color, background: `${color}15`, padding: "1px 8px", borderRadius: 12 }}>
                    {n.type.replace("_", " ")}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{n.channel}</span>
                </div>
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <i className="pi pi-bell" style={{ fontSize: "2rem", marginBottom: "0.75rem", display: "block" }} />
            No notifications yet.
          </div>
        )}
      </div>
      {total > 100 && (
        <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Showing latest 100 of {total.toLocaleString()} notifications.
        </div>
      )}
    </div>
  );
}
