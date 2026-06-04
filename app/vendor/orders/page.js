// app/vendor/orders/page.js — Vendor Orders (Bookings)
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Orders · Vendor · JP Tourism" };

const STATUS_COLORS = {
  PENDING: "#f59e0b",
  CONFIRMED: "#6366f1",
  PROCESSING: "#06b6d4",
  COMPLETED: "#22c55e",
  CANCELLED: "#ef4444",
  REFUNDED: "#a855f7",
};

const STAGE_LABELS = {
  ENQUIRY: "Enquiry",
  BOOKING_CREATED: "Created",
  DOCS_SUBMITTED: "Docs In",
  PROCESSING: "Processing",
  COMPLETED: "Done",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label}
  </span>
);

const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function VendorOrdersPage() {
  const session = await getSession();
  if (!session?.vendorId) return null;

  const [orders, total] = await Promise.all([
    prisma.booking.findMany({
      where: { vendorId: session.vendorId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        listing: { select: { title: true } },
        agency: { select: { businessName: true } },
        customer: { select: { firstName: true, lastName: true, phone: true } },
      },
    }),
    prisma.booking.count({ where: { vendorId: session.vendorId } }),
  ]);

  const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
  const totalRevenue = orders
    .filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED")
    .reduce((s, o) => s + (o.vendorPrice * o.quantity), 0);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Orders</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {total.toLocaleString()} total orders · Vendor revenue: {money(totalRevenue)}
        </p>
      </div>

      {/* Status summary */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {Object.entries(STATUS_COLORS).filter(([s]) => statusCounts[s]).map(([status, color]) => (
          <div key={status} style={{ background: `${color}15`, border: `1px solid ${color}33`, borderRadius: "10px", padding: "0.65rem 1.1rem", minWidth: 90 }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color }}>{statusCounts[status]}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{status}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
              {["Booking Ref", "Service", "Agency", "Customer", "Qty", "Vendor Revenue", "Pipeline", "Status", "Date"].map((h) => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--card-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td style={{ padding: "0.75rem 1rem", color: "#6366f1", fontWeight: 600, fontSize: "0.8rem" }}>{o.bookingRef}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem", maxWidth: 180 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.listing.title}</div>
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{o.agency.businessName}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  {o.customer.firstName} {o.customer.lastName}
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{o.quantity}</td>
                <td style={{ padding: "0.75rem 1rem", color: "#22c55e", fontWeight: 600 }}>{money(o.vendorPrice * o.quantity)}</td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  {badge(STAGE_LABELS[o.pipelineStage] ?? o.pipelineStage, "#6b7280")}
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>{badge(o.status, STATUS_COLORS[o.status] ?? "#888")}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(o.createdAt)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 100 && (
          <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--card-border)" }}>
            Showing latest 100 of {total.toLocaleString()} orders.
          </div>
        )}
      </div>
    </div>
  );
}
