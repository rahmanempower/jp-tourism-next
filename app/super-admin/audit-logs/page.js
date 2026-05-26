// app/super-admin/audit-logs/page.js — Audit Logs
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Audit Logs · Super Admin · JP Tourism" };

const ACTION_COLORS = {
  BOOKING_CREATED: "#6366f1",
  BOOKING_CANCELLED: "#ef4444",
  ESCROW_RELEASED: "#22c55e",
  ESCROW_REFUNDED: "#a855f7",
  VENDOR_APPROVED: "#22c55e",
  VENDOR_REJECTED: "#ef4444",
  LISTING_APPROVED: "#22c55e",
  LISTING_REJECTED: "#ef4444",
  WALLET_RECHARGED: "#06b6d4",
  KYC_SUBMITTED: "#f59e0b",
};

const actionColor = (action) => ACTION_COLORS[action] ?? "#6b7280";

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

export default async function AuditLogsPage() {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);

  // Action frequency
  const actionFreq = logs.reduce((acc, l) => { acc[l.action] = (acc[l.action] || 0) + 1; return acc; }, {});
  const topActions = Object.entries(actionFreq).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Audit Logs</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {total.toLocaleString()} total audit entries · showing latest 200
        </p>
      </div>

      {/* Top actions */}
      {topActions.length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "1.25rem", marginBottom: "1.75rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "1rem" }}>Top Actions (this page)</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {topActions.map(([action, count]) => {
              const color = actionColor(action);
              return (
                <div key={action} style={{ background: `${color}15`, border: `1px solid ${color}33`, borderRadius: "8px", padding: "0.5rem 0.9rem" }}>
                  <span style={{ fontSize: "0.75rem", color, fontWeight: 600 }}>{action.replace(/_/g, " ")}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>×{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {["Action", "Entity", "Entity ID", "Performed By", "IP Address", "Timestamp"].map((h) => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--card-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const color = actionColor(l.action);
              return (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
                      {l.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{l.entityType}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "monospace" }}>
                    {l.entityId.length > 12 ? `${l.entityId.slice(0, 12)}…` : l.entityId}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    {l.user.firstName} {l.user.lastName}
                    <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginLeft: "0.35rem" }}>({l.user.role.replace("_", " ")})</span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "monospace" }}>
                    {l.ipAddress ?? "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(l.createdAt)}</td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No audit logs recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 200 && (
          <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--card-border)" }}>
            Showing latest 200 of {total.toLocaleString()} entries.
          </div>
        )}
      </div>
    </div>
  );
}
