// app/vendor/listings/page.js — My Service Listings
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "My Listings · Vendor · JP Tourism" };

const STATUS_COLORS = {
  DRAFT: "#6b7280",
  PENDING_APPROVAL: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
  ARCHIVED: "#6b7280",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label}
  </span>
);

const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function VendorListingsPage() {
  const session = await getSession();
  if (!session?.vendorId) return null;

  const [listings, total] = await Promise.all([
    prisma.serviceListing.findMany({
      where: { vendorId: session.vendorId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bookings: true } } },
    }),
    prisma.serviceListing.count({ where: { vendorId: session.vendorId } }),
  ]);

  const statusCounts = listings.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>My Listings</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{total} service listings</p>
        </div>
      </div>

      {/* Status summary */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {Object.entries(STATUS_COLORS).filter(([s]) => statusCounts[s]).map(([status, color]) => (
          <div key={status} style={{ background: `${color}15`, border: `1px solid ${color}33`, borderRadius: "10px", padding: "0.65rem 1.1rem", minWidth: 90 }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color }}>{statusCounts[status]}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{status.replace(/_/g, " ")}</div>
          </div>
        ))}
      </div>

      {/* Listings cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {listings.map((l) => {
          const color = STATUS_COLORS[l.status] ?? "#6b7280";
          return (
            <div key={l.id} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem" }}>{l.title}</span>
                    {badge(l.status.replace(/_/g, " "), color)}
                  </div>
                  {l.description && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                      {l.description.length > 120 ? `${l.description.slice(0, 120)}…` : l.description}
                    </p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
                    <div><span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Category: </span><span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{l.category}</span></div>
                    <div><span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Destination: </span><span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{l.destinationCountry}</span></div>
                    <div><span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>SLA: </span><span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{l.slaDays} days</span></div>
                    <div><span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Bookings: </span><span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{l._count.bookings}</span></div>
                    <div><span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Created: </span><span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{fmt(l.createdAt)}</span></div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#22c55e" }}>{money(l.basePrice)}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{l.currency} · {l.refundablePercent}% refundable</div>
                </div>
              </div>
              {l.status === "REJECTED" && (
                <div style={{ marginTop: "0.75rem", background: "#ef444415", border: "1px solid #ef444433", borderRadius: "8px", padding: "0.5rem 0.85rem", fontSize: "0.8rem", color: "#ef4444" }}>
                  <i className="pi pi-times-circle" style={{ marginRight: "0.4rem" }} />
                  Listing was rejected. Edit and resubmit for approval.
                </div>
              )}
              {l.status === "PENDING_APPROVAL" && (
                <div style={{ marginTop: "0.75rem", background: "#f59e0b15", border: "1px solid #f59e0b33", borderRadius: "8px", padding: "0.5rem 0.85rem", fontSize: "0.8rem", color: "#f59e0b" }}>
                  <i className="pi pi-clock" style={{ marginRight: "0.4rem" }} />
                  Under review by the admin team.
                </div>
              )}
            </div>
          );
        })}
        {listings.length === 0 && (
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <i className="pi pi-list" style={{ fontSize: "2rem", marginBottom: "0.75rem", display: "block" }} />
            No listings yet. Contact support to add your first service listing.
          </div>
        )}
      </div>
    </div>
  );
}
