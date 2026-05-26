// app/agency/packages/page.js — Agency: Draft Packages
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Draft Packages · Agency · JP Tourism" };

const STATUS_COLORS = {
  DRAFT:     "#6b7280",
  SENT:      "#06b6d4",
  EXPIRED:   "#f59e0b",
  CONVERTED: "#22c55e",
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

export default async function AgencyPackagesPage() {
  const session = await getSession();
  if (!session?.agencyId) return null;

  const [packages, statusGroups] = await Promise.all([
    prisma.draftPackage.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: {
        enquiry: { select: { title: true } },
        items: { select: { id: true } },
      },
    }),
    prisma.draftPackage.groupBy({
      by: ["status"],
      where: { agencyId: session.agencyId },
      _count: { _all: true },
    }),
  ]);

  const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]));

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Draft Packages</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{packages.length} packages</p>
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
                <TH>Title</TH>
                <TH>Enquiry</TH>
                <TH>Version</TH>
                <TH>Items</TH>
                <TH>Subtotal</TH>
                <TH>Grand Total</TH>
                <TH>Status</TH>
                <TH>Expires</TH>
                <TH>WhatsApp</TH>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id}>
                  <TD style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.title}</TD>
                  <TD style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{p.enquiry?.title ?? "—"}</TD>
                  <TD style={{ color: "#6366f1" }}>v{p.version}</TD>
                  <TD>{p.items.length}</TD>
                  <TD>{money(p.subtotal)}</TD>
                  <TD style={{ fontWeight: 600, color: "var(--text-primary)" }}>{money(p.grandTotal)}</TD>
                  <TD>{badge(p.status, STATUS_COLORS[p.status] ?? "#888")}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(p.expiresAt)}</TD>
                  <TD>
                    <span style={{ color: p.whatsappSent ? "#22c55e" : "#6b7280", fontWeight: 600, fontSize: "0.78rem" }}>
                      {p.whatsappSent ? "Sent" : "Not sent"}
                    </span>
                  </TD>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No draft packages found.
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
