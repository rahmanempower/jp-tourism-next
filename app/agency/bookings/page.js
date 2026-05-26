// app/agency/bookings/page.js — Agency: All Bookings
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Bookings · Agency · JP Tourism" };

const STATUS_COLORS = {
  PENDING:    "#f59e0b",
  CONFIRMED:  "#06b6d4",
  PROCESSING: "#6366f1",
  COMPLETED:  "#22c55e",
  CANCELLED:  "#ef4444",
  REFUNDED:   "#a855f7",
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

export default async function AgencyBookingsPage() {
  const session = await getSession();
  if (!session?.agencyId) return null;

  const [bookings, statusGroups, totals] = await Promise.all([
    prisma.booking.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        listing: { select: { title: true } },
        vendor: { select: { businessName: true } },
      },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      where: { agencyId: session.agencyId },
      _count: { _all: true },
    }),
    prisma.booking.aggregate({
      where: { agencyId: session.agencyId },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
  ]);

  const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]));
  const totalSpend = totals._sum.totalAmount ?? 0;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>All Bookings</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{totals._count._all} bookings · total spend {money(totalSpend)}</p>
      </div>

      {/* Status chips */}
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
                <TH>Listing</TH>
                <TH>Vendor</TH>
                <TH>Qty</TH>
                <TH>Total</TH>
                <TH>Status</TH>
                <TH>Date</TH>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <TD style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6366f1" }}>{b.bookingRef}</TD>
                  <TD style={{ color: "var(--text-primary)" }}>
                    {b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : "—"}
                  </TD>
                  <TD>{b.listing?.title ?? "—"}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{b.vendor?.businessName ?? "—"}</TD>
                  <TD>{b.quantity}</TD>
                  <TD style={{ fontWeight: 600, color: "var(--text-primary)" }}>{money(b.totalAmount)}</TD>
                  <TD>{badge(b.status, STATUS_COLORS[b.status] ?? "#888")}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(b.createdAt)}</TD>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
