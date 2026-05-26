// app/agency/dashboard/page.js — Agency Dashboard
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Dashboard · Agency · JP Tourism" };

async function getAgencyKpis(agencyId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalBookings,
    bookingsMtd,
    activeBookings,
    totalCustomers,
    openEnquiries,
    agency,
  ] = await Promise.all([
    prisma.booking.count({ where: { agencyId } }),
    prisma.booking.count({ where: { agencyId, createdAt: { gte: startOfMonth } } }),
    prisma.booking.count({ where: { agencyId, status: { in: ["CONFIRMED", "PROCESSING"] } } }),
    prisma.customer.count({ where: { agencyId } }),
    prisma.enquiry.count({ where: { agencyId, status: { in: ["OPEN", "DRAFT_CREATED", "QUOTED"] } } }),
    prisma.agency.findUnique({
      where: { id: agencyId },
      select: { businessName: true, walletBalance: true, creditLimit: true },
    }),
  ]);

  return { totalBookings, bookingsMtd, activeBookings, totalCustomers, openEnquiries, agency };
}

export default async function AgencyDashboardPage() {
  const session = await getSession();
  if (!session?.agencyId) return null;

  const kpis = await getAgencyKpis(session.agencyId);
  const { agency } = kpis;
  const isOwner = session.role === "AGENCY_OWNER";

  const cards = [
    {
      label: "Total Bookings",
      value: kpis.totalBookings,
      sub: `${kpis.bookingsMtd} this month`,
      icon: "pi pi-calendar",
      color: "#6366f1",
    },
    {
      label: "Active Bookings",
      value: kpis.activeBookings,
      sub: "Confirmed + Processing",
      icon: "pi pi-check-circle",
      color: "#22c55e",
    },
    {
      label: "Customers",
      value: kpis.totalCustomers,
      sub: "In CRM",
      icon: "pi pi-users",
      color: "#f59e0b",
    },
    {
      label: "Open Enquiries",
      value: kpis.openEnquiries,
      sub: "Requiring attention",
      icon: "pi pi-question-circle",
      color: "#06b6d4",
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: "1.75rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          {agency?.businessName ?? "Agency Dashboard"}
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Welcome back, {session.firstName}.
        </p>
      </div>

      {/* Wallet summary (owner only) */}
      {isOwner && agency && (
        <div
          style={{
            background: "linear-gradient(135deg, #1a1f2e 0%, #1e2640 100%)",
            border: "1px solid #6366f133",
            borderRadius: "14px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Wallet Balance
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#6366f1" }}>
              ${agency.walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Credit Limit
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              ${agency.creditLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <a
              href="/agency/wallet"
              style={{
                background: "#6366f1",
                color: "#fff",
                borderRadius: "10px",
                padding: "0.6rem 1.25rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <i className="pi pi-wallet" />
              Manage Wallet
            </a>
          </div>
        </div>
      )}

      {/* KPI Cards */}
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

      {/* Quick Actions */}
      <div>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
          Quick Actions
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {[
            { label: "Browse Marketplace", href: "/agency/marketplace", icon: "pi pi-shop" },
            { label: "New Enquiry", href: "/agency/enquiries", icon: "pi pi-plus-circle" },
            { label: "All Bookings", href: "/agency/bookings", icon: "pi pi-calendar" },
            { label: "CRM Customers", href: "/agency/crm/customers", icon: "pi pi-users" },
            { label: "Draft Packages", href: "/agency/packages", icon: "pi pi-box" },
            ...(isOwner ? [{ label: "Invoices", href: "/agency/invoices", icon: "pi pi-file-pdf" }] : []),
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
              <i className={link.icon} style={{ fontSize: "0.9rem", color: "var(--color-agency)" }} />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
