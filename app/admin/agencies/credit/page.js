// app/admin/agencies/credit/page.js — Admin: Agency Credit Limits
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Credit Limits · Admin · JP Tourism" };

const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

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

export default async function AdminCreditLimitsPage() {
  const session = await getSession();
  if (!session) return null;

  const [agencies, totals] = await Promise.all([
    prisma.agency.findMany({
      orderBy: [{ isActive: "desc" }, { creditLimit: "desc" }],
      take: 200,
      include: { _count: { select: { bookings: true } } },
    }),
    prisma.agency.aggregate({
      _sum: { creditLimit: true, walletBalance: true },
      _avg: { creditLimit: true, marginPercent: true },
    }),
  ]);

  const totalCredit = totals._sum.creditLimit ?? 0;
  const totalWallet = totals._sum.walletBalance ?? 0;
  const avgCredit = totals._avg.creditLimit ?? 0;
  const avgMargin = totals._avg.marginPercent ?? 0;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Credit Limits</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Agency credit and wallet overview</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Total Credit Issued", value: money(totalCredit), color: "#6366f1", icon: "pi pi-credit-card" },
          { label: "Total Wallet Balance", value: money(totalWallet), color: "#22c55e", icon: "pi pi-wallet" },
          { label: "Avg Credit Limit", value: money(avgCredit), color: "#06b6d4", icon: "pi pi-chart-bar" },
          { label: "Avg Margin %", value: `${avgMargin.toFixed(1)}%`, color: "#f59e0b", icon: "pi pi-percentage" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.label}</span>
              <i className={c.icon} style={{ color: c.color }} />
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div style={{ background: "#6366f115", border: "1px solid #6366f133", borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1.5rem", fontSize: "0.82rem", color: "#818cf8" }}>
        <i className="pi pi-info-circle" style={{ marginRight: "0.5rem" }} />
        Credit limit and margin updates are available via the platform admin API. This view shows current settings per agency.
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Agency</TH>
                <TH>Active</TH>
                <TH>Wallet Balance</TH>
                <TH>Credit Limit</TH>
                <TH>Available Credit</TH>
                <TH>Margin %</TH>
                <TH>Bookings</TH>
                <TH>Utilisation</TH>
              </tr>
            </thead>
            <tbody>
              {agencies.map((a) => {
                const utilisation = a.creditLimit > 0 ? ((1 - a.walletBalance / a.creditLimit) * 100).toFixed(0) : 0;
                const utilColor = utilisation > 80 ? "#ef4444" : utilisation > 50 ? "#f59e0b" : "#22c55e";
                const availCredit = Math.max(0, a.creditLimit - Math.max(0, -a.walletBalance));
                return (
                  <tr key={a.id}>
                    <TD style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      <div>{a.businessName}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{a.contactEmail}</div>
                    </TD>
                    <TD>
                      <span style={{ color: a.isActive ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                        {a.isActive ? "Yes" : "No"}
                      </span>
                    </TD>
                    <TD style={{ color: a.walletBalance >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                      {money(a.walletBalance)}
                    </TD>
                    <TD style={{ fontWeight: 600, color: "var(--text-primary)" }}>{money(a.creditLimit)}</TD>
                    <TD>{money(availCredit)}</TD>
                    <TD>{a.marginPercent}%</TD>
                    <TD>{a._count.bookings}</TD>
                    <TD>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ flex: 1, height: 6, background: "#2a3050", borderRadius: 3, minWidth: 60 }}>
                          <div style={{ height: "100%", width: `${Math.min(Math.max(utilisation, 0), 100)}%`, background: utilColor, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: "0.75rem", color: utilColor, fontWeight: 600, minWidth: 32 }}>{utilisation}%</span>
                      </div>
                    </TD>
                  </tr>
                );
              })}
              {agencies.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No agencies found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
