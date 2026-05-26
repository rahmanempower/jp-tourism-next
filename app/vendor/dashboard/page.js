// app/vendor/dashboard/page.js — Vendor Dashboard
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Dashboard · Vendor · JP Tourism" };

async function getVendorKpis(vendorId) {
  const [
    totalListings,
    approvedListings,
    pendingListings,
    totalOrders,
    activeOrders,
    vendor,
  ] = await Promise.all([
    prisma.serviceListing.count({ where: { vendorId } }),
    prisma.serviceListing.count({ where: { vendorId, status: "APPROVED" } }),
    prisma.serviceListing.count({ where: { vendorId, status: "PENDING_APPROVAL" } }),
    prisma.booking.count({ where: { vendorId } }),
    prisma.booking.count({ where: { vendorId, status: { in: ["CONFIRMED", "PROCESSING"] } } }),
    prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { businessName: true, kycStatus: true, isActive: true, rating: true, slaBreachCount: true },
    }),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const ordersMtd = await prisma.booking.count({
    where: { vendorId, createdAt: { gte: startOfMonth } },
  });

  return { totalListings, approvedListings, pendingListings, totalOrders, activeOrders, ordersMtd, vendor };
}

export default async function VendorDashboardPage() {
  const session = await getSession();
  if (!session?.vendorId) return null;

  const kpis = await getVendorKpis(session.vendorId);
  const { vendor } = kpis;

  const kycColors = { PENDING: "#f59e0b", UNDER_REVIEW: "#6366f1", APPROVED: "#22c55e", REJECTED: "#ef4444" };
  const kycColor = kycColors[vendor?.kycStatus ?? "PENDING"];

  const cards = [
    {
      label: "My Listings",
      value: kpis.totalListings,
      sub: `${kpis.approvedListings} approved · ${kpis.pendingListings} pending`,
      icon: "pi pi-list",
      color: "#6366f1",
    },
    {
      label: "Active Orders",
      value: kpis.activeOrders,
      sub: `${kpis.ordersMtd} new this month`,
      icon: "pi pi-shopping-bag",
      color: "#14b8a6",
    },
    {
      label: "Total Orders",
      value: kpis.totalOrders,
      sub: "All-time bookings received",
      icon: "pi pi-calendar",
      color: "#f59e0b",
    },
    {
      label: "SLA Breaches",
      value: vendor?.slaBreachCount ?? 0,
      sub: "Cumulative breach count",
      icon: "pi pi-exclamation-triangle",
      color: "#ec4899",
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: "1.75rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          {vendor?.businessName ?? "Vendor Dashboard"}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Welcome back, {session.firstName}.
          </p>
          <span
            style={{
              background: `${kycColor}22`,
              color: kycColor,
              borderRadius: "6px",
              padding: "2px 10px",
              fontSize: "0.72rem",
              fontWeight: 600,
            }}
          >
            KYC: {vendor?.kycStatus}
          </span>
          {!vendor?.isActive && (
            <span
              style={{
                background: "#ef444422",
                color: "#ef4444",
                borderRadius: "6px",
                padding: "2px 10px",
                fontSize: "0.72rem",
                fontWeight: 600,
              }}
            >
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* KYC warning banner */}
      {vendor?.kycStatus !== "APPROVED" && (
        <div
          style={{
            background: "#f59e0b11",
            border: "1px solid #f59e0b44",
            borderRadius: "12px",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <i className="pi pi-id-card" style={{ color: "#f59e0b", fontSize: "1.1rem" }} />
          <div>
            <div style={{ fontWeight: 600, color: "#f59e0b", fontSize: "0.88rem" }}>
              Complete your KYC to activate your account
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.2rem" }}>
              Upload required documents to start receiving orders.
            </div>
          </div>
          <a
            href="/vendor/kyc"
            style={{
              marginLeft: "auto",
              background: "#f59e0b",
              color: "#000",
              borderRadius: "8px",
              padding: "0.4rem 1rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go to KYC
          </a>
        </div>
      )}

      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {cards.map((card) => (
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

      {/* Quick actions */}
      <div>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
          Quick Actions
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {[
            { label: "My Listings", href: "/vendor/listings", icon: "pi pi-list" },
            { label: "Active Orders", href: "/vendor/orders", icon: "pi pi-shopping-bag" },
            { label: "Review Documents", href: "/vendor/documents", icon: "pi pi-file" },
            { label: "KYC Status", href: "/vendor/kyc", icon: "pi pi-id-card" },
            { label: "Performance", href: "/vendor/performance", icon: "pi pi-chart-line" },
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
              }}
            >
              <i className={link.icon} style={{ fontSize: "0.9rem", color: "var(--color-vendor)" }} />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
