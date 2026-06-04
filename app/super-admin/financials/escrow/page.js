// app/super-admin/financials/escrow/page.js — Escrow Ledger
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Escrow · Super Admin · JP Tourism" };

const STATUS_COLORS = {
  HELD: "#f59e0b",
  RELEASED: "#22c55e",
  REFUNDED: "#a855f7",
  DISPUTED: "#ef4444",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label}
  </span>
);

const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function EscrowPage() {
  const [records, total, summary] = await Promise.all([
    prisma.escrowLedger.findMany({
      orderBy: { heldAt: "desc" },
      take: 100,
      include: {
        booking: { select: { bookingRef: true } },
        agency: { select: { businessName: true } },
        vendor: { select: { businessName: true } },
      },
    }),
    prisma.escrowLedger.count(),
    prisma.escrowLedger.groupBy({
      by: ["status"],
      _sum: { amount: true, commission: true },
      _count: true,
    }),
  ]);

  const summaryMap = Object.fromEntries(summary.map((s) => [s.status, s]));
  const heldAmount = summaryMap.HELD?._sum.amount ?? 0;
  const releasedAmount = summaryMap.RELEASED?._sum.amount ?? 0;
  const totalCommission = summary.reduce((s, r) => s + (r._sum.commission ?? 0), 0);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Wallet & Escrow</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{total.toLocaleString()} escrow records</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Currently Held", value: money(heldAmount), color: "#f59e0b", icon: "pi pi-lock" },
          { label: "Released to Date", value: money(releasedAmount), color: "#22c55e", icon: "pi pi-unlock" },
          { label: "Total Commission", value: money(totalCommission), color: "#a855f7", icon: "pi pi-percentage" },
          { label: "Total Records", value: total.toLocaleString(), color: "#6366f1", icon: "pi pi-list" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.label}</span>
              <i className={c.icon} style={{ color: c.color, fontSize: "1rem" }} />
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filter status summary */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => {
          const s = summaryMap[status];
          return (
            <div key={status} style={{ background: `${color}15`, border: `1px solid ${color}33`, borderRadius: "10px", padding: "0.65rem 1.1rem" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color }}>{s?._count ?? 0}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{status} · {money(s?._sum.amount ?? 0)}</div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
              {["Booking Ref", "Agency", "Vendor", "Amount", "Commission", "Status", "Held At", "Released At"].map((h) => (
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
                <td style={{ padding: "0.75rem 1rem", color: "#22c55e", fontWeight: 600 }}>{money(r.amount)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "#a855f7", fontWeight: 600 }}>{money(r.commission)}</td>
                <td style={{ padding: "0.75rem 1rem" }}>{badge(r.status, STATUS_COLORS[r.status] ?? "#888")}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(r.heldAt)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(r.releasedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 100 && (
          <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--card-border)" }}>
            Showing latest 100 of {total.toLocaleString()} records.
          </div>
        )}
      </div>
    </div>
  );
}
