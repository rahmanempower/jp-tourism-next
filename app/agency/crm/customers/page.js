// app/agency/crm/customers/page.js — Agency: CRM Customers
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Customers · Agency · JP Tourism" };

const STAGE_COLORS = {
  LEAD:       "#6b7280",
  ENQUIRY:    "#06b6d4",
  BOOKING:    "#6366f1",
  PROCESSING: "#f59e0b",
  COMPLETED:  "#22c55e",
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

export default async function AgencyCustomersPage() {
  const session = await getSession();
  if (!session?.agencyId) return null;

  const [customers, stageGroups] = await Promise.all([
    prisma.customer.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        _count: { select: { bookings: true, enquiries: true } },
      },
    }),
    prisma.customer.groupBy({
      by: ["pipelineStage"],
      where: { agencyId: session.agencyId },
      _count: { _all: true },
    }),
  ]);

  const stageMap = Object.fromEntries(stageGroups.map((g) => [g.pipelineStage, g._count._all]));

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>CRM Customers</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{customers.length} customers in your CRM</p>
      </div>

      {/* Pipeline stage chips */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {Object.entries(STAGE_COLORS).map(([s, color]) => (
          <div key={s} style={{ background: `${color}15`, border: `1px solid ${color}44`, borderRadius: 20, padding: "4px 14px", fontSize: "0.78rem", color }}>
            {s}: <strong>{stageMap[s] ?? 0}</strong>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Name</TH>
                <TH>Phone</TH>
                <TH>Nationality</TH>
                <TH>Pipeline Stage</TH>
                <TH>Bookings</TH>
                <TH>Enquiries</TH>
                <TH>Passport Expiry</TH>
                <TH>Tags</TH>
                <TH>Added</TH>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <TD style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    <div>{c.firstName} {c.lastName}</div>
                    {c.email && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.email}</div>}
                  </TD>
                  <TD>{c.phone}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{c.nationality ?? "—"}</TD>
                  <TD>{badge(c.pipelineStage, STAGE_COLORS[c.pipelineStage] ?? "#888")}</TD>
                  <TD style={{ color: "#6366f1" }}>{c._count.bookings}</TD>
                  <TD style={{ color: "#06b6d4" }}>{c._count.enquiries}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(c.passportExpiry)}</TD>
                  <TD>
                    {c.tags.length > 0
                      ? c.tags.map((t) => (
                          <span key={t} style={{ marginRight: "0.3rem", fontSize: "0.72rem", background: "#6366f122", color: "#a5b4fc", borderRadius: 4, padding: "1px 6px" }}>{t}</span>
                        ))
                      : <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(c.createdAt)}</TD>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No customers found.
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
