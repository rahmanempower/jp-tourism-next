// app/admin/financials/escrow/page.js — Admin: Escrow
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Escrow · Admin · JP Tourism" };

const ESCROW_COLORS = { HELD: "#f59e0b", RELEASED: "#22c55e", REFUNDED: "#a855f7", DISPUTED: "#ef4444" };

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label}
  </span>
);

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

export default async function AdminEscrowPage() {
  const session = await getSession();
  if (!session) return null;

  const [records, statusGroups, totals] = await Promise.all([
    prisma.escrowLedger.findMany({
      orderBy: { heldAt: "desc" },
      take: 200,
      include: {
        booking: { select: { bookingRef: true } },
        agency: { select: { businessName: true } },
        vendor: { select: { businessName: true } },
      },
    }),
    prisma.escrowLedger.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amount: true } }),
    prisma.escrowLedger.aggregate({ _sum: { amount: true, commission: true }, _count: { _all: true } }),
  ]);

  const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, { count: g._count._all, sum: g._sum.amount ?? 0 }]));

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Wallet & Escrow</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{totals._count._all.toLocaleString()} escrow records</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Total Held", value: money(statusMap.HELD?.sum ?? 0), color: "#f59e0b", icon: "pi pi-lock" },
          { label: "Total Released", value: money(statusMap.RELEASED?.sum ?? 0), color: "#22c55e", icon: "pi pi-check-circle" },
          { label: "Total Commission", value: money(totals._sum.commission ?? 0), color: "#a855f7", icon: "pi pi-percentage" },
          { label: "Total Records", value: totals._count._all.toLocaleString(), color: "#6366f1", icon: "pi pi-list" },
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

      {/* Status chips */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {Object.entries(ESCROW_COLORS).map(([s, color]) => (
          <div key={s} style={{ background: `${color}15`, border: `1px solid ${color}44`, borderRadius: 20, padding: "4px 14px", fontSize: "0.78rem", color }}>
            {s}: <strong>{statusMap[s]?.count ?? 0}</strong> · {money(statusMap[s]?.sum ?? 0)}
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Booking Ref</TH>
                <TH>Agency</TH>
                <TH>Vendor</TH>
                <TH>Amount</TH>
                <TH>Commission</TH>
                <TH>Status</TH>
                <TH>Held At</TH>
                <TH>Released At</TH>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <TD style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6366f1" }}>
                    {r.booking?.bookingRef ?? "—"}
                  </TD>
                  <TD>{r.agency?.businessName ?? "—"}</TD>
                  <TD>{r.vendor?.businessName ?? "—"}</TD>
                  <TD style={{ fontWeight: 600, color: "#22c55e" }}>{money(r.amount)}</TD>
                  <TD style={{ color: "#a855f7" }}>{money(r.commission)}</TD>
                  <TD>{badge(r.status, ESCROW_COLORS[r.status] ?? "#888")}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(r.heldAt)}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(r.releasedAt)}</TD>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No escrow records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
