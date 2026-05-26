// app/super-admin/vendors/page.js — All Vendors
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Vendors · Super Admin · JP Tourism" };

const KYC_COLORS = {
  PENDING: "#f59e0b",
  UNDER_REVIEW: "#6366f1",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label}
  </span>
);

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function VendorsPage() {
  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { listings: true, bookings: true } } },
    }),
    prisma.vendor.count(),
  ]);

  const kycCounts = vendors.reduce((acc, v) => { acc[v.kycStatus] = (acc[v.kycStatus] || 0) + 1; return acc; }, {});

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>All Vendors</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{total.toLocaleString()} vendors registered</p>
      </div>

      {/* KYC Summary */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {Object.entries(KYC_COLORS).map(([status, color]) => (
          <div key={status} style={{ background: `${color}15`, border: `1px solid ${color}33`, borderRadius: "10px", padding: "0.65rem 1.1rem", minWidth: 90 }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color }}>{kycCounts[status] ?? 0}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{status.replace("_", " ")}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {["Business Name", "Category", "KYC Status", "Active", "Rating", "Listings", "Bookings", "Joined"].map((h) => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--card-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)", fontWeight: 500 }}>{v.businessName}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{v.category.join(", ")}</td>
                <td style={{ padding: "0.75rem 1rem" }}>{badge(v.kycStatus, KYC_COLORS[v.kycStatus] ?? "#888")}</td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  {v.isActive ? <span style={{ color: "#22c55e", fontSize: "0.8rem" }}>● Active</span> : <span style={{ color: "#ef4444", fontSize: "0.8rem" }}>● Inactive</span>}
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{v.rating.toFixed(1)} ★</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{v._count.listings}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{v._count.bookings}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(v.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 100 && (
          <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--card-border)" }}>
            Showing latest 100 of {total.toLocaleString()} vendors.
          </div>
        )}
      </div>
    </div>
  );
}
