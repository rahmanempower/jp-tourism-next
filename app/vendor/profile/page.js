// app/vendor/profile/page.js — Vendor Profile
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "My Profile · Vendor · JP Tourism" };

const KYC_COLORS = { PENDING: "#f59e0b", UNDER_REVIEW: "#6366f1", APPROVED: "#22c55e", REJECTED: "#ef4444" };

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label}
  </span>
);

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const Field = ({ label, value }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{value || "—"}</span>
  </div>
);

export default async function VendorProfilePage() {
  const session = await getSession();
  if (!session?.vendorId) return null;

  const [vendor, user] = await Promise.all([
    prisma.vendor.findUnique({
      where: { id: session.vendorId },
      select: {
        id: true, businessName: true, slug: true, category: true, kycStatus: true,
        contactEmail: true, contactPhone: true, address: true, isActive: true,
        rating: true, slaBreachCount: true, createdAt: true, updatedAt: true,
        kycDocuments: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.id },
      select: { firstName: true, lastName: true, email: true, phone: true, isEmailVerified: true, lastLoginAt: true, createdAt: true },
    }),
  ]);

  if (!vendor || !user) return null;

  const kycColor = KYC_COLORS[vendor.kycStatus] ?? "#888";
  const addr = vendor.address && typeof vendor.address === "object" ? vendor.address : null;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>My Profile</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Your business and account details</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Business Info */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>Business Information</h3>
            {badge(vendor.kycStatus.replace("_", " "), kycColor)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem" }}>
            <Field label="Business Name" value={vendor.businessName} />
            <Field label="Slug" value={vendor.slug} />
            <Field label="Contact Email" value={vendor.contactEmail} />
            <Field label="Contact Phone" value={vendor.contactPhone} />
            <Field label="Categories" value={vendor.category.join(", ")} />
            <Field label="Status" value={vendor.isActive ? "Active" : "Inactive"} />
            <Field label="Rating" value={`${vendor.rating.toFixed(1)} / 5.0`} />
            <Field label="SLA Breaches" value={String(vendor.slaBreachCount)} />
            {addr && (
              <>
                <Field label="Street" value={addr.street} />
                <Field label="City" value={addr.city} />
                <Field label="Country" value={addr.country} />
              </>
            )}
            <Field label="Member Since" value={fmt(vendor.createdAt)} />
            <Field label="Last Updated" value={fmt(vendor.updatedAt)} />
          </div>
        </div>

        {/* Account Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "1.25rem" }}>Account Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem" }}>
              <Field label="First Name" value={user.firstName} />
              <Field label="Last Name" value={user.lastName} />
              <Field label="Email" value={user.email} />
              <Field label="Phone" value={user.phone} />
              <Field label="Email Verified" value={user.isEmailVerified ? "Yes" : "No"} />
              <Field label="Last Login" value={fmt(user.lastLoginAt)} />
              <Field label="Account Created" value={fmt(user.createdAt)} />
            </div>
          </div>

          {/* KYC Documents */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>KYC Documents</h3>
              <a href="/vendor/kyc" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>
                Manage KYC →
              </a>
            </div>
            {vendor.kycDocuments?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {vendor.kycDocuments.map((doc, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    <i className="pi pi-file" style={{ color: "#6366f1" }} />
                    <span>{typeof doc === "object" && doc !== null ? (doc.type ?? `Document ${i + 1}`) : `Document ${i + 1}`}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                No KYC documents uploaded.{" "}
                <a href="/vendor/kyc" style={{ color: "#6366f1" }}>Submit KYC →</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
