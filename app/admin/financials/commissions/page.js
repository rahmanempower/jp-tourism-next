// app/admin/financials/commissions/page.js — Admin: Commissions
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Commissions · Admin · JP Tourism" };

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

export default async function AdminCommissionsPage() {
  const session = await getSession();
  if (!session) return null;

  const [released, totals] = await Promise.all([
    prisma.escrowLedger.findMany({
      where: { status: "RELEASED" },
      orderBy: { releasedAt: "desc" },
      take: 200,
      include: {
        booking: { select: { bookingRef: true } },
        agency: { select: { businessName: true } },
        vendor: { select: { businessName: true } },
      },
    }),
    prisma.escrowLedger.aggregate({
      where: { status: "RELEASED" },
      _sum: { commission: true, amount: true },
      _count: { _all: true },
      _avg: { commission: true },
    }),
  ]);

  const totalCommission = totals._sum.commission ?? 0;
  const totalReleased = totals._sum.amount ?? 0;
  const avgCommission = totals._avg.commission ?? 0;

  // Monthly breakdown — last 6 months
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const records = released.filter((r) => r.releasedAt && r.releasedAt >= d && r.releasedAt < end);
    const commission = records.reduce((s, r) => s + Number(r.commission), 0);
    return { label, commission, count: records.length };
  });
  const maxComm = Math.max(...months.map((m) => m.commission), 1);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Commissions</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Platform commission earned from released escrow</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Total Commission", value: money(totalCommission), color: "#a855f7", icon: "pi pi-percentage" },
          { label: "Released Bookings", value: totals._count._all.toLocaleString(), color: "#22c55e", icon: "pi pi-check-circle" },
          { label: "Released Amount", value: money(totalReleased), color: "#06b6d4", icon: "pi pi-wallet" },
          { label: "Avg Commission", value: money(avgCommission), color: "#f59e0b", icon: "pi pi-chart-bar" },
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

      {/* Monthly chart */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "1.25rem" }}>Monthly Commission — Last 6 Months</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", height: 120 }}>
          {months.map((m) => {
            const heightPct = (m.commission / maxComm) * 100;
            return (
              <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#a855f7" }}>{money(m.commission)}</span>
                <div style={{ width: "100%", background: "#a855f733", borderRadius: "6px 6px 0 0", height: 80, display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%", background: "#a855f7", borderRadius: "6px 6px 0 0", height: `${Math.max(heightPct, m.commission > 0 ? 8 : 0)}%` }} />
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Booking Ref</TH>
                <TH>Agency</TH>
                <TH>Vendor</TH>
                <TH>Booking Amount</TH>
                <TH>Commission</TH>
                <TH>Released At</TH>
              </tr>
            </thead>
            <tbody>
              {released.map((r) => (
                <tr key={r.id}>
                  <TD style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6366f1" }}>{r.booking?.bookingRef ?? "—"}</TD>
                  <TD>{r.agency?.businessName ?? "—"}</TD>
                  <TD>{r.vendor?.businessName ?? "—"}</TD>
                  <TD style={{ color: "#22c55e", fontWeight: 600 }}>{money(r.amount)}</TD>
                  <TD style={{ color: "#a855f7", fontWeight: 600 }}>{money(r.commission)}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(r.releasedAt)}</TD>
                </tr>
              ))}
              {released.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No released commissions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
