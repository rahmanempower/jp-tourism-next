// app/vendor/performance/page.js — Vendor Performance Stats
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Performance · Vendor · JP Tourism" };

const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default async function VendorPerformancePage() {
  const session = await getSession();
  if (!session?.vendorId) return null;

  const vendorId = session.vendorId;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [vendor, totalOrders, completedOrders, cancelledOrders, activeOrders, ordersMtd, escrowSummary] =
    await Promise.all([
      prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { businessName: true, kycStatus: true, isActive: true, rating: true, slaBreachCount: true, createdAt: true },
      }),
      prisma.booking.count({ where: { vendorId } }),
      prisma.booking.count({ where: { vendorId, status: "COMPLETED" } }),
      prisma.booking.count({ where: { vendorId, status: "CANCELLED" } }),
      prisma.booking.count({ where: { vendorId, status: { in: ["CONFIRMED", "PROCESSING"] } } }),
      prisma.booking.count({ where: { vendorId, createdAt: { gte: startOfMonth } } }),
      prisma.escrowLedger.aggregate({
        where: { vendorId, status: "RELEASED" },
        _sum: { amount: true, commission: true },
      }),
    ]);

  // Last 6 months order counts
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1), label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) };
  });

  const monthlyData = await Promise.all(
    months.map(async (m) => {
      const count = await prisma.booking.count({
        where: { vendorId, createdAt: { gte: m.start, lt: m.end } },
      });
      return { ...m, count };
    })
  );

  const totalRevenue = escrowSummary._sum.amount ?? 0;
  const completionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : "0.0";
  const cancellationRate = totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : "0.0";
  const maxCount = Math.max(...monthlyData.map((m) => m.count), 1);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Performance</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{vendor?.businessName} · All-time statistics</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Total Orders", value: totalOrders.toLocaleString(), color: "#6366f1", icon: "pi pi-shopping-bag" },
          { label: "Completed", value: completedOrders.toLocaleString(), color: "#22c55e", icon: "pi pi-check-circle", sub: `${completionRate}% rate` },
          { label: "Active", value: activeOrders.toLocaleString(), color: "#06b6d4", icon: "pi pi-spin pi-spinner" },
          { label: "Cancelled", value: cancelledOrders.toLocaleString(), color: "#ef4444", icon: "pi pi-times-circle", sub: `${cancellationRate}% rate` },
          { label: "This Month", value: ordersMtd.toLocaleString(), color: "#f59e0b", icon: "pi pi-calendar" },
          { label: "Revenue Received", value: money(totalRevenue), color: "#a855f7", icon: "pi pi-wallet" },
          { label: "Rating", value: `${(vendor?.rating ?? 0).toFixed(1)} ★`, color: "#f59e0b", icon: "pi pi-star-fill" },
          { label: "SLA Breaches", value: (vendor?.slaBreachCount ?? 0).toLocaleString(), color: vendor?.slaBreachCount > 0 ? "#ef4444" : "#22c55e", icon: "pi pi-exclamation-triangle" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.label}</span>
              <i className={c.icon} style={{ color: c.color, fontSize: "1rem" }} />
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: c.color }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Monthly order chart (bar) */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "1.5rem" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "1.25rem" }}>Orders — Last 6 Months</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", height: 120 }}>
          {monthlyData.map((m) => {
            const heightPct = maxCount > 0 ? (m.count / maxCount) * 100 : 0;
            return (
              <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6366f1" }}>{m.count}</span>
                <div style={{ width: "100%", background: "#6366f133", borderRadius: "6px 6px 0 0", height: 80, display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%", background: "#6366f1", borderRadius: "6px 6px 0 0", height: `${Math.max(heightPct, m.count > 0 ? 8 : 0)}%`, transition: "height 0.3s" }} />
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center" }}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
