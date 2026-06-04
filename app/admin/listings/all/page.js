// app/admin/listings/all/page.js — Admin: All Listings
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";
import { isDatabaseReachable, withPrismaFallback } from "@/lib/prismaResilience.js";

export const metadata = { title: "All Listings · Admin · JP Tourism" };

const STATUS_COLORS = {
  DRAFT: "#6b7280",
  PENDING_APPROVAL: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
  ARCHIVED: "#6366f1",
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

export default async function AdminAllListingsPage() {
  const session = await getSession();
  if (!session) return null;

  const fallback = { listings: [], statusCounts: [] };

  const reachable = await isDatabaseReachable(prisma, "admin-all-listings-page");

  const { listings, statusCounts } = !reachable
    ? fallback
    : await withPrismaFallback(
        async () => {
          const [listings, statusCounts] = await Promise.all([
            prisma.serviceListing.findMany({
              orderBy: { createdAt: "desc" },
              take: 200,
              include: { vendor: { select: { businessName: true } } },
            }),
            prisma.serviceListing.groupBy({ by: ["status"], _count: { _all: true } }),
          ]);

          return { listings, statusCounts };
        },
        fallback,
        "admin-all-listings-page"
      );

  const statusMap = Object.fromEntries(statusCounts.map((g) => [g.status, g._count._all]));

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>All Listings</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{listings.length} listings · <a href="/admin/listings" style={{ color: "#6366f1", textDecoration: "none" }}>Pending Approvals →</a></p>
      </div>

      {/* Status summary chips */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ background: `${color}15`, border: `1px solid ${color}44`, borderRadius: 20, padding: "4px 14px", fontSize: "0.78rem", color }}>
            {status.replace("_", " ")}: <strong>{statusMap[status] ?? 0}</strong>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--table-header-bg)" }}>
              <tr>
                <TH>Title</TH>
                <TH>Vendor</TH>
                <TH>Category</TH>
                <TH>Destination</TH>
                <TH>Base Price</TH>
                <TH>SLA Days</TH>
                <TH>Status</TH>
                <TH>Created</TH>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <TD style={{ color: "var(--text-primary)", fontWeight: 500, maxWidth: 200 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                  </TD>
                  <TD>{l.vendor?.businessName ?? "—"}</TD>
                  <TD>{l.category}</TD>
                  <TD>{l.destinationCountry ?? "—"}</TD>
                  <TD>${Number(l.basePrice).toFixed(2)}</TD>
                  <TD>{l.slaDays}d</TD>
                  <TD>{badge(l.status.replace("_", " "), STATUS_COLORS[l.status] ?? "#888")}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(l.createdAt)}</TD>
                </tr>
              ))}
              {listings.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No listings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
