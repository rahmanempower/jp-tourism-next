// app/admin/invoices/page.js — Admin: Invoices
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Invoices · Admin · JP Tourism" };

const STATUS_COLORS = { DRAFT: "#6b7280", ISSUED: "#06b6d4", PAID: "#22c55e", VOID: "#ef4444" };
const TYPE_COLORS = { BOOKING: "#6366f1", WALLET_RECHARGE: "#f59e0b", COMMISSION: "#a855f7", REFUND: "#ef4444" };

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

export default async function AdminInvoicesPage() {
  const session = await getSession();
  if (!session) return null;

  const [invoices, statusGroups, totals] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { issuedAt: "desc" },
      take: 200,
      include: { agency: { select: { businessName: true } } },
    }),
    prisma.invoice.groupBy({ by: ["status"], _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.invoice.aggregate({
      _sum: { totalAmount: true, paidAmount: true },
      _count: { _all: true },
    }),
  ]);

  const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, { count: g._count._all, sum: g._sum.totalAmount ?? 0 }]));
  const totalInvoiced = totals._sum.totalAmount ?? 0;
  const totalPaid = totals._sum.paidAmount ?? 0;
  const outstanding = totalInvoiced - totalPaid;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Invoices</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{totals._count._all.toLocaleString()} invoices total</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Total Invoiced", value: money(totalInvoiced), color: "#6366f1", icon: "pi pi-file-pdf" },
          { label: "Total Paid", value: money(totalPaid), color: "#22c55e", icon: "pi pi-check-circle" },
          { label: "Outstanding", value: money(outstanding), color: outstanding > 0 ? "#f59e0b" : "#22c55e", icon: "pi pi-clock" },
          { label: "Total Invoices", value: totals._count._all.toLocaleString(), color: "#06b6d4", icon: "pi pi-list" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.label}</span>
              <i className={c.icon} style={{ color: c.color }} />
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Status chips */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {Object.entries(STATUS_COLORS).map(([s, color]) => (
          <div key={s} style={{ background: `${color}15`, border: `1px solid ${color}44`, borderRadius: 20, padding: "4px 14px", fontSize: "0.78rem", color }}>
            {s}: <strong>{statusMap[s]?.count ?? 0}</strong> · {money(statusMap[s]?.sum ?? 0)}
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Invoice #</TH>
                <TH>Agency</TH>
                <TH>Type</TH>
                <TH>Subtotal</TH>
                <TH>Tax</TH>
                <TH>Total</TH>
                <TH>Paid</TH>
                <TH>Status</TH>
                <TH>Issued</TH>
                <TH>Due</TH>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <TD style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6366f1" }}>{inv.invoiceNumber}</TD>
                  <TD>{inv.agency?.businessName ?? "—"}</TD>
                  <TD>{badge(inv.type.replace("_", " "), TYPE_COLORS[inv.type] ?? "#888")}</TD>
                  <TD>{money(inv.subtotal)}</TD>
                  <TD>{money(inv.taxAmount)}</TD>
                  <TD style={{ fontWeight: 600, color: "var(--text-primary)" }}>{money(inv.totalAmount)}</TD>
                  <TD style={{ color: "#22c55e" }}>{money(inv.paidAmount)}</TD>
                  <TD>{badge(inv.status, STATUS_COLORS[inv.status] ?? "#888")}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(inv.issuedAt)}</TD>
                  <TD style={{ color: inv.dueAt && new Date(inv.dueAt) < new Date() && inv.status !== "PAID" ? "#ef4444" : "var(--text-muted)" }}>
                    {fmt(inv.dueAt)}
                  </TD>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No invoices found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
