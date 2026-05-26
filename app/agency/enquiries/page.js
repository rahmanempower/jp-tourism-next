// app/agency/enquiries/page.js — Agency: Enquiries
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Enquiries · Agency · JP Tourism" };

const STATUS_COLORS = {
  OPEN:          "#06b6d4",
  DRAFT_CREATED: "#6366f1",
  QUOTED:        "#f59e0b",
  CONVERTED:     "#22c55e",
  LOST:          "#ef4444",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label?.replace("_", " ")}
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

export default async function AgencyEnquiriesPage() {
  const session = await getSession();
  if (!session?.agencyId) return null;

  const [enquiries, statusGroups] = await Promise.all([
    prisma.enquiry.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        draftPackages: { select: { id: true }, take: 1 },
      },
    }),
    prisma.enquiry.groupBy({
      by: ["status"],
      where: { agencyId: session.agencyId },
      _count: { _all: true },
    }),
  ]);

  const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]));

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Enquiries</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{enquiries.length} enquiries for your agency</p>
      </div>

      {/* Status chips */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {Object.entries(STATUS_COLORS).map(([s, color]) => (
          <div key={s} style={{ background: `${color}15`, border: `1px solid ${color}44`, borderRadius: 20, padding: "4px 14px", fontSize: "0.78rem", color }}>
            {s.replace("_", " ")}: <strong>{statusMap[s] ?? 0}</strong>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Title</TH>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH>Drafts</TH>
                <TH>Updated</TH>
                <TH>Created</TH>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((e) => (
                <tr key={e.id}>
                  <TD style={{ color: "var(--text-primary)", fontWeight: 500 }}>{e.title}</TD>
                  <TD>
                    {e.customer
                      ? `${e.customer.firstName} ${e.customer.lastName}`
                      : <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </TD>
                  <TD>{badge(e.status, STATUS_COLORS[e.status] ?? "#888")}</TD>
                  <TD style={{ color: "#a855f7" }}>{e.draftPackages.length}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(e.updatedAt)}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(e.createdAt)}</TD>
                </tr>
              ))}
              {enquiries.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No enquiries found.
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
