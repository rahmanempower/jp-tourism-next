// app/admin/agencies/page.js — Admin: All Agencies
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Agencies · Admin · JP Tourism" };

const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

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

export default async function AdminAgenciesPage() {
  const session = await getSession();
  if (!session) return null;

  const [agencies, totalCount, activeCount] = await Promise.all([
    prisma.agency.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        _count: { select: { users: true, bookings: true, customers: true } },
      },
    }),
    prisma.agency.count(),
    prisma.agency.count({ where: { isActive: true } }),
  ]);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>All Agencies</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {totalCount} total ·{" "}
          <span style={{ color: "#22c55e" }}>{activeCount} active</span> ·{" "}
          <span style={{ color: "#ef4444" }}>{totalCount - activeCount} inactive</span>
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Agencies", value: totalCount, color: "#6366f1" },
          { label: "Active", value: activeCount, color: "#22c55e" },
          { label: "Inactive", value: totalCount - activeCount, color: "#ef4444" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>{c.label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Business Name</TH>
                <TH>Contact</TH>
                <TH>Wallet</TH>
                <TH>Credit Limit</TH>
                <TH>Margin %</TH>
                <TH>Active</TH>
                <TH>Staff</TH>
                <TH>Bookings</TH>
                <TH>Customers</TH>
                <TH>Joined</TH>
              </tr>
            </thead>
            <tbody>
              {agencies.map((a) => (
                <tr key={a.id}>
                  <TD style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    <div>{a.businessName}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{a.licenseNumber ?? "—"}</div>
                  </TD>
                  <TD>
                    <div style={{ fontSize: "0.82rem" }}>{a.contactEmail}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{a.contactPhone ?? "—"}</div>
                  </TD>
                  <TD style={{ color: "#22c55e", fontWeight: 600 }}>{money(a.walletBalance)}</TD>
                  <TD>{money(a.creditLimit)}</TD>
                  <TD>{a.marginPercent}%</TD>
                  <TD>
                    <span style={{ color: a.isActive ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                      {a.isActive ? "Yes" : "No"}
                    </span>
                  </TD>
                  <TD>{a._count.users}</TD>
                  <TD>{a._count.bookings}</TD>
                  <TD>{a._count.customers}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(a.createdAt)}</TD>
                </tr>
              ))}
              {agencies.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No agencies found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
