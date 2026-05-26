// app/super-admin/financials/invoices/page.js — All Invoices
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Invoices · Super Admin · JP Tourism" };

const STATUS_COLORS = {
  DRAFT: "#6b7280",
  ISSUED: "#6366f1",
  PAID: "#22c55e",
  VOID: "#ef4444",
};

const TYPE_COLORS = {
  BOOKING: "#6366f1",
  WALLET_RECHARGE: "#22c55e",
  COMMISSION: "#a855f7",
  REFUND: "#f59e0b",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label}
  </span>
);

const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function InvoicesPage() {
  const [invoices, total, summary] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { agency: { select: { businessName: true } } },
    }),
    prisma.invoice.count(),
    prisma.invoice.groupBy({
      by: ["status"],
      _sum: { totalAmount: true, paidAmount: true },
      _count: true,
    }),
  ]);

  const summaryMap = Object.fromEntries(summary.map((s) => [s.status, s]));
  const totalAmount = summary.reduce((s, r) => s + (r._sum.totalAmount ?? 0), 0);
  const paidAmount = summary.reduce((s, r) => s + (r._sum.paidAmount ?? 0), 0);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>All Invoices</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{total.toLocaleString()} invoices platform-wide</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Total Invoiced", value: money(totalAmount), color: "#6366f1" },
          { label: "Total Paid", value: money(paidAmount), color: "#22c55e" },
          { label: "Outstanding", value: money(totalAmount - paidAmount), color: "#f59e0b" },
          { label: "Total Invoices", value: total.toLocaleString(), color: "#a855f7" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>{c.label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => {
          const s = summaryMap[status];
          return (
            <div key={status} style={{ background: `${color}15`, border: `1px solid ${color}33`, borderRadius: "10px", padding: "0.65rem 1.1rem" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color }}>{s?._count ?? 0}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{status} · {money(s?._sum.totalAmount ?? 0)}</div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {["Invoice #", "Agency", "Type", "Subtotal", "Tax", "Total", "Paid", "Status", "Issued At", "Due At"].map((h) => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--card-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td style={{ padding: "0.75rem 1rem", color: "#6366f1", fontWeight: 600, fontSize: "0.8rem" }}>{inv.invoiceNumber}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{inv.agency.businessName}</td>
                <td style={{ padding: "0.75rem 1rem" }}>{badge(inv.type.replace("_", " "), TYPE_COLORS[inv.type] ?? "#888")}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{money(inv.subtotal)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{money(inv.taxAmount)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)", fontWeight: 600 }}>{money(inv.totalAmount)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "#22c55e", fontWeight: 600 }}>{money(inv.paidAmount)}</td>
                <td style={{ padding: "0.75rem 1rem" }}>{badge(inv.status, STATUS_COLORS[inv.status] ?? "#888")}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(inv.issuedAt)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(inv.dueAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 100 && (
          <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--card-border)" }}>
            Showing latest 100 of {total.toLocaleString()} invoices.
          </div>
        )}
      </div>
    </div>
  );
}
