// app/super-admin/financials/commissions/page.js — Platform Commissions
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Commissions · Super Admin · JP Tourism" };

const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function CommissionsPage() {
  const [records, totalEscrow] = await Promise.all([
    prisma.escrowLedger.findMany({
      where: { status: "RELEASED" },
      orderBy: { releasedAt: "desc" },
      take: 100,
      include: {
        booking: { select: { bookingRef: true, totalAmount: true, createdAt: true } },
        agency: { select: { businessName: true } },
        vendor: { select: { businessName: true } },
      },
    }),
    prisma.escrowLedger.count({ where: { status: "RELEASED" } }),
  ]);

  const totalCommission = records.reduce((s, r) => s + (r.commission ?? 0), 0);
  const totalReleasedAmount = records.reduce((s, r) => s + (r.amount ?? 0), 0);

  // Monthly breakdown
  const monthly = {};
  for (const r of records) {
    if (!r.releasedAt) continue;
    const key = new Date(r.releasedAt).toLocaleDateString("en-US", { year: "numeric", month: "short" });
    if (!monthly[key]) monthly[key] = { commission: 0, count: 0 };
    monthly[key].commission += r.commission ?? 0;
    monthly[key].count += 1;
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Platform Commissions</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Commission earned from released escrow records</p>
      </div>

      {/* Top KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Total Commission Earned", value: money(totalCommission), color: "#a855f7" },
          { label: "Released Bookings", value: totalEscrow.toLocaleString(), color: "#22c55e" },
          { label: "Released Amount", value: money(totalReleasedAmount), color: "#6366f1" },
          { label: "Avg Commission/Booking", value: totalEscrow > 0 ? money(totalCommission / totalEscrow) : "$0.00", color: "#f59e0b" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>{c.label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Monthly breakdown */}
      {Object.keys(monthly).length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "1.25rem", marginBottom: "1.75rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "1rem" }}>Monthly Breakdown</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {Object.entries(monthly).map(([month, data]) => (
              <div key={month} style={{ background: "var(--table-header-bg)", border: "1px solid #2a3050", borderRadius: "10px", padding: "0.75rem 1.1rem", minWidth: 130 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>{month}</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#a855f7" }}>{money(data.commission)}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{data.count} bookings</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission records table */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--card-border)" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>Released Records</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
              {["Booking Ref", "Agency", "Vendor", "Booking Total", "Escrow Amount", "Commission", "Released At"].map((h) => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--card-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td style={{ padding: "0.75rem 1rem", color: "#6366f1", fontWeight: 600, fontSize: "0.8rem" }}>{r.booking.bookingRef}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{r.agency.businessName}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{r.vendor.businessName}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{money(r.booking.totalAmount)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "#22c55e", fontWeight: 600 }}>{money(r.amount)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "#a855f7", fontWeight: 700 }}>{money(r.commission)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(r.releasedAt)}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No released escrow records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        {totalEscrow > 100 && (
          <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--card-border)" }}>
            Showing latest 100 of {totalEscrow.toLocaleString()} records.
          </div>
        )}
      </div>
    </div>
  );
}
