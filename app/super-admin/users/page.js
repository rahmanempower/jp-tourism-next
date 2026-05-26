// app/super-admin/users/page.js — All Platform Users
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Users · Super Admin · JP Tourism" };

const ROLE_COLORS = {
  SUPER_ADMIN: "#a855f7",
  ADMIN: "#6366f1",
  VENDOR: "#14b8a6",
  AGENCY_OWNER: "#f59e0b",
  AGENCY_STAFF: "#fb923c",
};

const badge = (label, color) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: "0.72rem",
      fontWeight: 600,
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
    }}
  >
    {label}
  </span>
);

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function UsersPage() {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        vendor: { select: { businessName: true } },
        agency: { select: { businessName: true } },
      },
    }),
    prisma.user.count(),
  ]);

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const summaryCards = Object.entries(ROLE_COLORS).map(([role, color]) => ({
    role,
    color,
    count: roleCounts[role] ?? 0,
  }));

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          All Users
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {total.toLocaleString()} total users across all roles
        </p>
      </div>

      {/* Role summary */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {summaryCards.map(({ role, color, count }) => (
          <div
            key={role}
            style={{
              background: `${color}15`,
              border: `1px solid ${color}33`,
              borderRadius: "10px",
              padding: "0.65rem 1.1rem",
              minWidth: 110,
            }}
          >
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color }}>{count}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
              {role.replace("_", " ")}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {["Name", "Email", "Role", "Entity", "Active", "Last Login", "Created"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    borderBottom: "1px solid var(--card-border)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)", fontWeight: 500 }}>
                  {u.firstName} {u.lastName}
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{u.email}</td>
                <td style={{ padding: "0.75rem 1rem" }}>{badge(u.role.replace("_", " "), ROLE_COLORS[u.role] ?? "#888")}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {u.vendor?.businessName ?? u.agency?.businessName ?? "—"}
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  {u.isActive
                    ? <span style={{ color: "#22c55e", fontSize: "0.8rem" }}>● Active</span>
                    : <span style={{ color: "#ef4444", fontSize: "0.8rem" }}>● Inactive</span>}
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {fmt(u.lastLoginAt)}
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {fmt(u.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 100 && (
          <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--card-border)" }}>
            Showing latest 100 of {total.toLocaleString()} users.
          </div>
        )}
      </div>
    </div>
  );
}
