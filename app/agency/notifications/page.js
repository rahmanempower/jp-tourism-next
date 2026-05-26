// app/agency/notifications/page.js — Agency: Notifications
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Notifications · Agency · JP Tourism" };

const TYPE_COLORS = {
  BOOKING:        "#6366f1",
  DOCUMENT:       "#06b6d4",
  PAYMENT:        "#22c55e",
  STATUS_CHANGE:  "#f59e0b",
  SYSTEM:         "#a855f7",
};

const DELIVERY_COLORS = {
  PENDING:   "#f59e0b",
  SENT:      "#06b6d4",
  DELIVERED: "#22c55e",
  FAILED:    "#ef4444",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label?.replace("_", " ")}
  </span>
);

const fmt = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const TH = ({ children }) => (
  <th style={{ padding: "0.65rem 1rem", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.72rem", color: "var(--text-muted)", borderBottom: "1px solid var(--card-border)", whiteSpace: "nowrap" }}>
    {children}
  </th>
);
const TD = ({ children, style }) => (
  <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--card-border)", fontSize: "0.85rem", color: "var(--text-secondary)", ...style }}>
    {children}
  </td>
);

export default async function AgencyNotificationsPage() {
  const session = await getSession();
  if (!session?.agencyId) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Notifications</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {notifications.length} notifications
          {unreadCount > 0 && (
            <span style={{ marginLeft: "0.5rem", background: "#6366f1", color: "#fff", borderRadius: 12, padding: "1px 8px", fontSize: "0.72rem", fontWeight: 700 }}>
              {unreadCount} unread
            </span>
          )}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {notifications.map((n) => {
          const typeColor = TYPE_COLORS[n.type] ?? "#888";
          return (
            <div
              key={n.id}
              style={{
                background: n.isRead ? "var(--card-bg)" : `${typeColor}08`,
                border: `1px solid ${n.isRead ? "var(--card-border)" : `${typeColor}33`}`,
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: `${typeColor}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <i
                  className={
                    n.type === "BOOKING" ? "pi pi-calendar" :
                    n.type === "DOCUMENT" ? "pi pi-file" :
                    n.type === "PAYMENT" ? "pi pi-credit-card" :
                    n.type === "STATUS_CHANGE" ? "pi pi-refresh" :
                    "pi pi-info-circle"
                  }
                  style={{ color: typeColor, fontSize: "1rem" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: n.isRead ? 400 : 600, color: "var(--text-primary)" }}>
                    {n.title}
                  </span>
                  {!n.isRead && (
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: typeColor, display: "inline-block" }} />
                  )}
                  {badge(n.type, typeColor)}
                  {badge(n.channel, "#888")}
                </div>
                {n.message && (
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>{n.message}</div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{fmt(n.createdAt)}</span>
                  {badge(n.deliveryStatus, DELIVERY_COLORS[n.deliveryStatus] ?? "#888")}
                </div>
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "14px",
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <i className="pi pi-bell-slash" style={{ fontSize: "2rem", marginBottom: "0.75rem", display: "block" }} />
            No notifications yet.
          </div>
        )}
      </div>
    </div>
  );
}
