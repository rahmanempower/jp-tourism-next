// app/super-admin/bookings/page.js — All Bookings
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Bookings · Super Admin · JP Tourism" };

const STATUS_COLORS = {
  PENDING: "#f59e0b",
  CONFIRMED: "#6366f1",
  PROCESSING: "#06b6d4",
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

export default async function BookingsPage() {
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        agency: { select: { businessName: true } },
        vendor: { select: { businessName: true } },
        listing: { select: { title: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.booking.count(),
  ]);

  const statusCounts = bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {});
  const totalRevenue = bookings
    .filter((b) => b.status !== "CANCELLED" && b.status !== "REFUNDED")
    .reduce((s, b) => s + (b.totalAmount ?? 0), 0);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>All Bookings</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {total.toLocaleString()} total bookings · Revenue (shown): {money(totalRevenue)}
        </p>
      </div>

      {/* Status summary */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {Object.entries(STATUS_COLORS).filter(([s]) => statusCounts[s]).map(([status, color]) => (
          <div key={status} style={{ background: `${color}15`, border: `1px solid ${color}33`, borderRadius: "10px", padding: "0.65rem 1.1rem", minWidth: 90 }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color }}>{statusCounts[status] ?? 0}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{status}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {["Booking Ref", "Customer", "Agency", "Vendor", "Service", "Qty", "Total", "Commission", "Status", "Date"].map((h) => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--card-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td style={{ padding: "0.75rem 1rem", color: "#6366f1", fontWeight: 600, fontSize: "0.8rem" }}>{b.bookingRef}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  {b.customer.firstName} {b.customer.lastName}
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{b.agency.businessName}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{b.vendor.businessName}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", maxWidth: 180 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.listing.title}</div>
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{b.quantity}</td>
                <td style={{ padding: "0.75rem 1rem", color: "#22c55e", fontWeight: 600 }}>{money(b.totalAmount)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "#a855f7", fontWeight: 600 }}>{money(b.platformCommission)}</td>
                <td style={{ padding: "0.75rem 1rem" }}>{badge(b.status, STATUS_COLORS[b.status] ?? "#888")}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(b.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 100 && (
          <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--card-border)" }}>
            Showing latest 100 of {total.toLocaleString()} bookings.
          </div>
        )}
      </div>
    </div>
  );
}
