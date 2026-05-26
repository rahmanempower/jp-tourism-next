// app/admin/dashboard/page.js — Admin Platform Dashboard
// Server Component: fetches KPIs server-side, renders static PrimeReact cards.
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Dashboard · Admin · JP Tourism" };

async function getKpis() {
  const [
    totalBookings,
    activeVendors,
    activeAgencies,
    pendingKyc,
    pendingListings,
    totalEscrowHeld,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.vendor.count({ where: { isActive: true } }),
    prisma.agency.count({ where: { isActive: true } }),
    prisma.vendor.count({ where: { kycStatus: "UNDER_REVIEW" } }),
    prisma.serviceListing.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.escrowLedger.aggregate({ where: { status: "HELD" }, _sum: { amount: true } }),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const bookingsMtd = await prisma.booking.count({
    where: { createdAt: { gte: startOfMonth } },
  });

  return {
    totalBookings,
    bookingsMtd,
    activeVendors,
    activeAgencies,
    pendingKyc,
    pendingListings,
    escrowHeld: totalEscrowHeld._sum.amount ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const session = await getSession();
  const kpis = await getKpis();

  const kpiCards = [
    {
      label: "Total Bookings",
      value: kpis.totalBookings.toLocaleString(),
      icon: "pi pi-calendar",
      color: "#6366f1",
      sub: `${kpis.bookingsMtd} this month`,
    },
    {
      label: "Active Vendors",
      value: kpis.activeVendors.toLocaleString(),
      icon: "pi pi-building",
      color: "#14b8a6",
      sub: `${kpis.pendingKyc} pending KYC review`,
    },
    {
      label: "Active Agencies",
      value: kpis.activeAgencies.toLocaleString(),
      icon: "pi pi-briefcase",
      color: "#f59e0b",
      sub: "Travel agencies on platform",
    },
    {
      label: "Escrow Held",
      value: `$${kpis.escrowHeld.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: "pi pi-lock",
      color: "#ec4899",
      sub: "Pending release",
    },
  ];

  const alertCards = [
    kpis.pendingKyc > 0 && {
      label: "KYC Pending Review",
      value: kpis.pendingKyc,
      href: "/admin/kyc",
      icon: "pi pi-id-card",
      severity: "warn",
    },
    kpis.pendingListings > 0 && {
      label: "Listing Approvals",
      value: kpis.pendingListings,
      href: "/admin/listings",
      icon: "pi pi-check-square",
      severity: "info",
    },
  ].filter(Boolean);

  return (
    <div>
      <div style={{ marginBottom: "1.75rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          Platform Overview
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Welcome back, {session?.firstName}. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {kpiCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "14px",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
                {card.label}
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${card.color}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className={card.icon} style={{ color: card.color, fontSize: "1rem" }} />
              </div>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {card.value}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Action-required alerts */}
      {alertCards.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            Action Required
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {alertCards.map((alert) => (
              <a
                key={alert.label}
                href={alert.href}
                style={{
                  textDecoration: "none",
                  background: "var(--card-bg)",
                  border: `1px solid ${alert.severity === "warn" ? "#f59e0b44" : "#6366f144"}`,
                  borderRadius: "12px",
                  padding: "1rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  minWidth: "220px",
                  transition: "border-color 0.2s",
                }}
              >
                <i
                  className={alert.icon}
                  style={{
                    fontSize: "1.25rem",
                    color: alert.severity === "warn" ? "#f59e0b" : "#6366f1",
                  }}
                />
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{alert.label}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {alert.value}
                  </div>
                </div>
                <i className="pi pi-arrow-right" style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.8rem" }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
          Quick Actions
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {[
            { label: "Review KYC", href: "/admin/kyc", icon: "pi pi-id-card" },
            { label: "Approve Listings", href: "/admin/listings", icon: "pi pi-check-square" },
            { label: "All Bookings", href: "/admin/bookings", icon: "pi pi-calendar" },
            { label: "Escrow Ledger", href: "/admin/financials/escrow", icon: "pi pi-lock" },
            { label: "Commission Report", href: "/admin/financials/commissions", icon: "pi pi-chart-bar" },
            { label: "All Vendors", href: "/admin/vendors", icon: "pi pi-building" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                textDecoration: "none",
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                padding: "0.6rem 1.1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              <i className={link.icon} style={{ fontSize: "0.9rem", color: "var(--brand-primary)" }} />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
