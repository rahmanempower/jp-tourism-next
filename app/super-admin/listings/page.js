// app/super-admin/listings/page.js — All Service Listings
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Listings · Super Admin · JP Tourism" };

const STATUS_COLORS = {
  DRAFT: "#6b7280",
  PENDING_APPROVAL: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
  ARCHIVED: "#6b7280",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label}
  </span>
);

const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function ListingsPage() {
  const [listings, total] = await Promise.all([
    prisma.serviceListing.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { vendor: { select: { businessName: true } } },
    }),
    prisma.serviceListing.count(),
  ]);

  const statusCounts = listings.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>All Listings</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{total.toLocaleString()} service listings on platform</p>
      </div>

      {/* Status summary */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {Object.entries(STATUS_COLORS).filter(([s]) => statusCounts[s]).map(([status, color]) => (
          <div key={status} style={{ background: `${color}15`, border: `1px solid ${color}33`, borderRadius: "10px", padding: "0.65rem 1.1rem", minWidth: 90 }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color }}>{statusCounts[status] ?? 0}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{status.replace("_", " ")}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {["Title", "Vendor", "Category", "Destination", "Base Price", "SLA (days)", "Status", "Created"].map((h) => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--card-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)", fontWeight: 500, maxWidth: 220 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{l.vendor.businessName}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{l.category}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{l.destinationCountry}</td>
                <td style={{ padding: "0.75rem 1rem", color: "#22c55e", fontWeight: 600 }}>{money(l.basePrice)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{l.slaDays}</td>
                <td style={{ padding: "0.75rem 1rem" }}>{badge(l.status.replace("_", " "), STATUS_COLORS[l.status] ?? "#888")}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 100 && (
          <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--card-border)" }}>
            Showing latest 100 of {total.toLocaleString()} listings.
          </div>
        )}
      </div>
    </div>
  );
}
