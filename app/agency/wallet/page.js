// app/agency/wallet/page.js — Agency: Wallet & Transactions
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Wallet · Agency · JP Tourism" };

const TX_TYPE_COLORS = {
  CREDIT:          "#22c55e",
  DEBIT:           "#ef4444",
  ESCROW_HOLD:     "#f59e0b",
  ESCROW_RELEASE:  "#06b6d4",
  REFUND:          "#a855f7",
  COMMISSION:      "#6366f1",
};

const TX_STATUS_COLORS = {
  PENDING:   "#f59e0b",
  COMPLETED: "#22c55e",
  FAILED:    "#ef4444",
  REVERSED:  "#a855f7",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label?.replace("_", " ")}
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

export default async function AgencyWalletPage() {
  const session = await getSession();
  if (!session?.agencyId) return null;

  const [agency, transactions, totals] = await Promise.all([
    prisma.agency.findUnique({
      where: { id: session.agencyId },
      select: { businessName: true, walletBalance: true, creditLimit: true, marginPercent: true },
    }),
    prisma.walletTransaction.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.walletTransaction.aggregate({
      where: { agencyId: session.agencyId },
      _sum: { amount: true },
    }),
  ]);

  if (!agency) return null;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Wallet</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{agency.businessName}</p>
      </div>

      {/* Wallet summary */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a1f2e 0%, #1e2640 100%)",
          border: "1px solid #6366f133",
          borderRadius: "16px",
          padding: "1.75rem",
          marginBottom: "1.75rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {[
          { label: "Current Balance",  value: money(agency.walletBalance),    color: "#6366f1" },
          { label: "Credit Limit",     value: money(agency.creditLimit),      color: "#22c55e" },
          { label: "Margin %",         value: `${agency.marginPercent}%`,     color: "#f59e0b" },
          { label: "Transactions",     value: transactions.length,            color: "#06b6d4" },
        ].map((c) => (
          <div key={c.label}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>{c.label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Transaction ledger */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--card-border)" }}>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Transaction History</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Date</TH>
                <TH>Type</TH>
                <TH>Description</TH>
                <TH>Amount</TH>
                <TH>Balance Before</TH>
                <TH>Balance After</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isCredit = ["CREDIT", "ESCROW_RELEASE", "REFUND"].includes(tx.type);
                return (
                  <tr key={tx.id}>
                    <TD style={{ color: "var(--text-muted)" }}>{fmt(tx.createdAt)}</TD>
                    <TD>{badge(tx.type, TX_TYPE_COLORS[tx.type] ?? "#888")}</TD>
                    <TD style={{ maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description}</TD>
                    <TD style={{ fontWeight: 600, color: isCredit ? "#22c55e" : "#ef4444" }}>
                      {isCredit ? "+" : "-"}{money(Math.abs(tx.amount))}
                    </TD>
                    <TD style={{ color: "var(--text-muted)" }}>{money(tx.balanceBefore)}</TD>
                    <TD style={{ color: "var(--text-muted)" }}>{money(tx.balanceAfter)}</TD>
                    <TD>{badge(tx.status, TX_STATUS_COLORS[tx.status] ?? "#888")}</TD>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No transactions found.
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
