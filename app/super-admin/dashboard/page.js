// app/super-admin/dashboard/page.js — Super Admin Dashboard
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";
import { isDatabaseReachable, withPrismaFallback } from "@/lib/prismaResilience.js";

export const metadata = { title: "Dashboard · Super Admin · JP Tourism" };

async function getKpis() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const fallback = {
    totalUsers: 0,
    totalVendors: 0,
    totalAgencies: 0,
    totalBookings: 0,
    bookingsMtd: 0,
    pendingKyc: 0,
    pendingListings: 0,
    escrowHeld: 0,
    totalCustomers: 0,
  };

  const reachable = await isDatabaseReachable(prisma, "super-admin-dashboard");
  if (!reachable) return fallback;

  return withPrismaFallback(
    async () => {
      const [
        totalUsers,
        totalVendors,
        totalAgencies,
        totalBookings,
        bookingsMtd,
        pendingKyc,
        pendingListings,
        escrowHeld,
        totalCustomers,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.vendor.count(),
        prisma.agency.count(),
        prisma.booking.count(),
        prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.vendor.count({ where: { kycStatus: { in: ["PENDING", "UNDER_REVIEW"] } } }),
        prisma.serviceListing.count({ where: { status: "PENDING_APPROVAL" } }),
        prisma.escrowLedger.aggregate({ where: { status: "HELD" }, _sum: { amount: true } }),
        prisma.customer.count(),
      ]);

      return {
        totalUsers,
        totalVendors,
        totalAgencies,
        totalBookings,
        bookingsMtd,
        pendingKyc,
        pendingListings,
        escrowHeld: escrowHeld._sum.amount ?? 0,
        totalCustomers,
      };
    },
    fallback,
    "super-admin-dashboard"
  );
}

export default async function SuperAdminDashboardPage() {
  const session = await getSession();
  const kpis = await getKpis();

  const kpiCards = [
    { label: "Total Users",     value: kpis.totalUsers.toLocaleString(),    icon: "pi pi-users",       color: "#6366f1" },
    { label: "Vendors",         value: kpis.totalVendors.toLocaleString(),  icon: "pi pi-building",    color: "#14b8a6", sub: `${kpis.pendingKyc} pending KYC` },
    { label: "Agencies",        value: kpis.totalAgencies.toLocaleString(), icon: "pi pi-briefcase",   color: "#f59e0b" },
    { label: "Customers",       value: kpis.totalCustomers.toLocaleString(),icon: "pi pi-user",        color: "#06b6d4" },
    { label: "Total Bookings",  value: kpis.totalBookings.toLocaleString(), icon: "pi pi-calendar",    color: "#a855f7", sub: `${kpis.bookingsMtd} this month` },
    { label: "Escrow Held",     value: `$${kpis.escrowHeld.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: "pi pi-lock", color: "#ec4899", sub: "Pending release" },
  ];

  const alerts = [
    kpis.pendingKyc > 0      && { label: "KYC Pending",        value: kpis.pendingKyc,      href: "/admin/kyc",      icon: "pi pi-id-card",      color: "#f59e0b" },
    kpis.pendingListings > 0 && { label: "Listing Approvals",  value: kpis.pendingListings, href: "/admin/listings", icon: "pi pi-check-square", color: "#6366f1" },
  ].filter(Boolean);

  return (
    <div>
      <div style={{ marginBottom: "1.75rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          Platform Overview
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Welcome back, {session?.firstName}. Full platform visibility.
        </p>
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        {kpiCards.map((card) => (
          <div
            key={card.label}
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "1.5rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>{card.label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${card.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={card.icon} style={{ color: card.color, fontSize: "1rem" }} />
              </div>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>{card.value}</div>
            {card.sub && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Action alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            Action Required
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {alerts.map((a) => (
              <a
                key={a.label}
                href={a.href}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  background: `${a.color}15`, border: `1px solid ${a.color}40`,
                  borderRadius: "12px", padding: "0.85rem 1.25rem",
                  textDecoration: "none", color: "inherit",
                }}
              >
                <i className={a.icon} style={{ color: a.color, fontSize: "1.1rem" }} />
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{a.label}</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: a.color }}>{a.value}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "1.25rem" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "1rem" }}>Quick Navigation</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {[
            { label: "All Vendors",  href: "/super-admin/vendors",           icon: "pi pi-building" },
            { label: "All Agencies", href: "/super-admin/agencies",          icon: "pi pi-briefcase" },
            { label: "Bookings",     href: "/super-admin/bookings",          icon: "pi pi-calendar" },
            { label: "Escrow",       href: "/super-admin/financials/escrow", icon: "pi pi-lock" },
            { label: "Invoices",     href: "/super-admin/financials/invoices", icon: "pi pi-file-pdf" },
            { label: "Audit Logs",   href: "/super-admin/audit-logs",        icon: "pi pi-shield" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                background: "#1a1f2e", border: "1px solid #2a3050",
                borderRadius: "8px", padding: "0.55rem 1rem",
                textDecoration: "none", fontSize: "0.85rem", color: "var(--text-secondary)",
              }}
            >
              <i className={l.icon} style={{ fontSize: "0.9rem", color: "#6366f1" }} />
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
