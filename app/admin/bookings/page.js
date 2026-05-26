// app/admin/bookings/page.js — Admin: All Bookings
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "All Bookings · Admin · JP Tourism" };

const STATUS_COLORS = {
  PENDING: "#f59e0b",
  CONFIRMED: "#06b6d4",
  PROCESSING: "#6366f1",
  COMPLETED: "#22c55e",
  CANCELLED: "#ef4444",
  REFUNDED: "#a855f7",
};

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

export default async function AdminBookingsPage() {
  const session = await getSession();
  if (!session) return null;

  const [bookings, statusCounts, totals] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        agency: { select: { businessName: true } },
        vendor: { select: { businessName: true } },
        listing: { select: { title: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.booking.aggregate({ _sum: { totalAmount: true, platformCommission: true }, _count: { _all: true } }),
  ]);

  const statusMap = Object.fromEntries(statusCounts.map((g) => [g.status, g._count._all]));
  const totalRevenue = totals._sum.totalAmount ?? 0;
  const totalCommission = totals._sum.platformCommission ?? 0;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>All Bookings</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{totals._count._all.toLocaleString()} total bookings</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Bookings", value: totals._count._all.toLocaleString(), color: "#6366f1" },
          { label: "Total Revenue", value: money(totalRevenue), color: "#22c55e" },
          { label: "Platform Commission", value: money(totalCommission), color: "#a855f7" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>{c.label}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Status summary chips */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {Object.entries(STATUS_COLORS).map(([s, color]) => (
          <div key={s} style={{ background: `${color}15`, border: `1px solid ${color}44`, borderRadius: 20, padding: "4px 14px", fontSize: "0.78rem", color }}>
            {s}: <strong>{statusMap[s] ?? 0}</strong>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Ref</TH>
                <TH>Customer</TH>
                <TH>Agency</TH>
                <TH>Vendor</TH>
                <TH>Service</TH>
                <TH>Qty</TH>
                <TH>Total</TH>
                <TH>Commission</TH>
                <TH>Status</TH>
                <TH>Date</TH>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <TD style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6366f1" }}>{b.bookingRef}</TD>
                  <TD>{b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : "—"}</TD>
                  <TD>{b.agency?.businessName ?? "—"}</TD>
                  <TD>{b.vendor?.businessName ?? "—"}</TD>
                  <TD style={{ maxWidth: 160 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.listing?.title ?? "—"}</div>
                  </TD>
                  <TD>{b.quantity}</TD>
                  <TD style={{ fontWeight: 600, color: "#22c55e" }}>{money(b.totalAmount)}</TD>
                  <TD style={{ color: "#a855f7" }}>{money(b.platformCommission)}</TD>
                  <TD>{badge(b.status, STATUS_COLORS[b.status] ?? "#888")}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(b.createdAt)}</TD>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {totals._count._all > 200 && (
        <div style={{ marginTop: "0.75rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Showing latest 200 of {totals._count._all.toLocaleString()} bookings.
        </div>
      )}
    </div>
  );
}
