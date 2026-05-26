// app/admin/vendors/page.js — Admin: All Vendors
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Vendors · Admin · JP Tourism" };

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

export default async function AdminVendorsPage() {
  const session = await getSession();
  if (!session) return null;

  const [vendors, kycCounts] = await Promise.all([
    prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        _count: { select: { listings: true, bookings: true } },
      },
    }),
    prisma.vendor.groupBy({ by: ["kycStatus"], _count: { _all: true } }),
  ]);

  const kycMap = Object.fromEntries(kycCounts.map((g) => [g.kycStatus, g._count._all]));

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>All Vendors</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{vendors.length} vendors registered</p>
      </div>

      {/* KYC summary chips */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {Object.entries(KYC_COLORS).map(([status, color]) => (
          <div key={status} style={{ background: `${color}15`, border: `1px solid ${color}44`, borderRadius: 20, padding: "4px 14px", fontSize: "0.78rem", color }}>
            {status.replace("_", " ")}: <strong>{kycMap[status] ?? 0}</strong>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Business Name</TH>
                <TH>Category</TH>
                <TH>KYC Status</TH>
                <TH>Active</TH>
                <TH>Rating</TH>
                <TH>Listings</TH>
                <TH>Bookings</TH>
                <TH>Joined</TH>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} style={{ transition: "background 0.15s" }}>
                  <TD style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    <div>{v.businessName}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{v.contactEmail}</div>
                  </TD>
                  <TD>{v.category.join(", ")}</TD>
                  <TD>{badge(v.kycStatus.replace("_", " "), KYC_COLORS[v.kycStatus] ?? "#888")}</TD>
                  <TD>
                    <span style={{ color: v.isActive ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                      {v.isActive ? "Active" : "Inactive"}
                    </span>
                  </TD>
                  <TD>{v.rating.toFixed(1)} ★</TD>
                  <TD>{v._count.listings}</TD>
                  <TD>{v._count.bookings}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(v.createdAt)}</TD>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No vendors found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
