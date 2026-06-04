// app/super-admin/agencies/page.js — All Agencies
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Agencies · Super Admin · JP Tourism" };

const money = (n) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function AgenciesPage() {
  const [agencies, total] = await Promise.all([
    prisma.agency.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        _count: { select: { users: true, bookings: true, customers: true } },
      },
    }),
    prisma.agency.count(),
  ]);

  const totalWallet = agencies.reduce((s, a) => s + (a.walletBalance ?? 0), 0);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>All Agencies</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{total.toLocaleString()} agencies · Total wallet balance: {money(totalWallet)}</p>
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
              {["Business Name", "Email", "License", "Wallet Balance", "Credit Limit", "Margin %", "Active", "Users", "Bookings", "Customers", "Joined"].map((h) => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--card-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agencies.map((a) => (
              <tr key={a.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)", fontWeight: 500 }}>{a.businessName}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{a.contactEmail}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{a.licenseNumber ?? "—"}</td>
                <td style={{ padding: "0.75rem 1rem", color: "#22c55e", fontWeight: 600 }}>{money(a.walletBalance)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{money(a.creditLimit)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{a.marginPercent}%</td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  {a.isActive ? <span style={{ color: "#22c55e", fontSize: "0.8rem" }}>● Active</span> : <span style={{ color: "#ef4444", fontSize: "0.8rem" }}>● Inactive</span>}
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{a._count.users}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{a._count.bookings}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{a._count.customers}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(a.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 100 && (
          <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--card-border)" }}>
            Showing latest 100 of {total.toLocaleString()} agencies.
          </div>
        )}
      </div>
    </div>
  );
}
