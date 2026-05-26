/**
 * components/layout/menuConfig.js
 * Navigation menu definitions per role.
 * Each item: { label, icon, href, section? }
 */

export const MENUS = {
  SUPER_ADMIN: [
    { label: "Dashboard", icon: "pi pi-home", href: "/super-admin/dashboard" },
    { section: "Platform" },
    { label: "Users", icon: "pi pi-users", href: "/super-admin/users" },
    { label: "Vendors", icon: "pi pi-building", href: "/super-admin/vendors" },
    { label: "Agencies", icon: "pi pi-briefcase", href: "/super-admin/agencies" },
    { section: "Marketplace" },
    { label: "Listings", icon: "pi pi-list", href: "/super-admin/listings" },
    { label: "Bookings", icon: "pi pi-calendar", href: "/super-admin/bookings" },
    { section: "Financials" },
    { label: "Wallet & Escrow", icon: "pi pi-wallet", href: "/super-admin/financials/escrow" },
    { label: "Commissions", icon: "pi pi-percentage", href: "/super-admin/financials/commissions" },
    { label: "Invoices", icon: "pi pi-file", href: "/super-admin/financials/invoices" },
    { section: "System" },
    { label: "Audit Logs", icon: "pi pi-shield", href: "/super-admin/audit-logs" },
    { label: "Settings", icon: "pi pi-cog", href: "/super-admin/settings" },
  ],

  ADMIN: [
    { label: "Dashboard", icon: "pi pi-home", href: "/admin/dashboard" },
    { section: "Vendors" },
    { label: "KYC Review", icon: "pi pi-id-card", href: "/admin/kyc" },
    { label: "All Vendors", icon: "pi pi-building", href: "/admin/vendors" },
    { section: "Marketplace" },
    { label: "Listing Approvals", icon: "pi pi-check-square", href: "/admin/listings" },
    { label: "All Listings", icon: "pi pi-list", href: "/admin/listings/all" },
    { section: "Agencies" },
    { label: "All Agencies", icon: "pi pi-briefcase", href: "/admin/agencies" },
    { label: "Credit Limits", icon: "pi pi-credit-card", href: "/admin/agencies/credit" },
    { section: "Orders" },
    { label: "All Bookings", icon: "pi pi-calendar", href: "/admin/bookings" },
    { section: "Financials" },
    { label: "Escrow", icon: "pi pi-lock", href: "/admin/financials/escrow" },
    { label: "Commissions", icon: "pi pi-chart-bar", href: "/admin/financials/commissions" },
    { label: "Invoices", icon: "pi pi-file-pdf", href: "/admin/invoices" },
    { section: "System" },
    { label: "Notifications", icon: "pi pi-bell", href: "/admin/notifications" },
  ],

  VENDOR: [
    { label: "Dashboard", icon: "pi pi-home", href: "/vendor/dashboard" },
    { section: "Services" },
    { label: "My Listings", icon: "pi pi-list", href: "/vendor/listings" },
    { section: "Orders" },
    { label: "Orders", icon: "pi pi-shopping-bag", href: "/vendor/orders" },
    { label: "Documents", icon: "pi pi-file", href: "/vendor/documents" },
    { section: "Profile" },
    { label: "KYC Status", icon: "pi pi-id-card", href: "/vendor/kyc" },
    { label: "Performance", icon: "pi pi-chart-line", href: "/vendor/performance" },
    { label: "My Profile", icon: "pi pi-user", href: "/vendor/profile" },
    { section: "Other" },
    { label: "Notifications", icon: "pi pi-bell", href: "/vendor/notifications" },
  ],

  AGENCY_OWNER: [
    { label: "Dashboard", icon: "pi pi-home", href: "/agency/dashboard" },
    { label: "Marketplace", icon: "pi pi-shop", href: "/agency/marketplace" },
    { section: "Enquiries" },
    { label: "Enquiries", icon: "pi pi-question-circle", href: "/agency/enquiries" },
    { label: "Draft Packages", icon: "pi pi-box", href: "/agency/packages" },
    { section: "Bookings" },
    { label: "All Bookings", icon: "pi pi-calendar", href: "/agency/bookings" },
    { section: "CRM" },
    { label: "Customers", icon: "pi pi-users", href: "/agency/crm/customers" },
    { label: "Pipeline", icon: "pi pi-sliders-h", href: "/agency/crm/pipeline" },
    { section: "Finance" },
    { label: "Wallet", icon: "pi pi-wallet", href: "/agency/wallet" },
    { label: "Invoices", icon: "pi pi-file-pdf", href: "/agency/invoices" },
    { section: "Manage" },
    { label: "Documents", icon: "pi pi-file", href: "/agency/documents" },
    { label: "Staff", icon: "pi pi-user-plus", href: "/agency/staff" },
    { section: "Other" },
    { label: "Notifications", icon: "pi pi-bell", href: "/agency/notifications" },
  ],

  AGENCY_STAFF: [
    { label: "Dashboard", icon: "pi pi-home", href: "/agency/dashboard" },
    { label: "Marketplace", icon: "pi pi-shop", href: "/agency/marketplace" },
    { section: "Work" },
    { label: "Enquiries", icon: "pi pi-question-circle", href: "/agency/enquiries" },
    { label: "Draft Packages", icon: "pi pi-box", href: "/agency/packages" },
    { label: "Bookings", icon: "pi pi-calendar", href: "/agency/bookings" },
    { section: "CRM" },
    { label: "Customers", icon: "pi pi-users", href: "/agency/crm/customers" },
    { section: "Other" },
    { label: "Documents", icon: "pi pi-file", href: "/agency/documents" },
    { label: "Notifications", icon: "pi pi-bell", href: "/agency/notifications" },
  ],
};

export const ROLE_META = {
  SUPER_ADMIN: {
    label: "Super Admin",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.15)",
    accent: "#a855f7",
  },
  ADMIN: {
    label: "Admin",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.15)",
    accent: "#6366f1",
  },
  VENDOR: {
    label: "Vendor",
    color: "#14b8a6",
    bg: "rgba(20,184,166,0.15)",
    accent: "#14b8a6",
  },
  AGENCY_OWNER: {
    label: "Agency Owner",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.15)",
    accent: "#f59e0b",
  },
  AGENCY_STAFF: {
    label: "Agency Staff",
    color: "#fb923c",
    bg: "rgba(251,146,60,0.15)",
    accent: "#fb923c",
  },
};
