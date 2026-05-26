// app/vendor/documents/page.js — Documents for Vendor Orders
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Documents · Vendor · JP Tourism" };

const REVIEW_COLORS = {
  PENDING: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label}
  </span>
);

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default async function VendorDocumentsPage() {
  const session = await getSession();
  if (!session?.vendorId) return null;

  // Fetch documents belonging to bookings for this vendor
  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where: { booking: { vendorId: session.vendorId } },
      orderBy: { uploadedAt: "desc" },
      take: 100,
      include: {
        booking: { select: { bookingRef: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.document.count({ where: { booking: { vendorId: session.vendorId } } }),
  ]);

  const reviewCounts = documents.reduce((acc, d) => { acc[d.reviewStatus] = (acc[d.reviewStatus] || 0) + 1; return acc; }, {});

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Documents</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {total.toLocaleString()} customer documents across your bookings
        </p>
      </div>

      {/* Review status summary */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {Object.entries(REVIEW_COLORS).map(([status, color]) => (
          <div key={status} style={{ background: `${color}15`, border: `1px solid ${color}33`, borderRadius: "10px", padding: "0.65rem 1.1rem", minWidth: 90 }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color }}>{reviewCounts[status] ?? 0}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{status}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {["Document Name", "Type", "Customer", "Booking Ref", "File Size", "Mime Type", "Review Status", "Uploaded"].map((h) => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--card-border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)", fontWeight: 500 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <i className="pi pi-file" style={{ color: "#6366f1", fontSize: "0.9rem" }} />
                    {doc.name}
                  </div>
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{doc.type}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  {doc.customer.firstName} {doc.customer.lastName}
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "#6366f1", fontSize: "0.8rem", fontWeight: 600 }}>{doc.booking.bookingRef}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fileSize(doc.fileSizeBytes)}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>{doc.mimeType}</td>
                <td style={{ padding: "0.75rem 1rem" }}>{badge(doc.reviewStatus, REVIEW_COLORS[doc.reviewStatus] ?? "#888")}</td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmt(doc.uploadedAt)}</td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  No documents uploaded for your bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 100 && (
          <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--card-border)" }}>
            Showing latest 100 of {total.toLocaleString()} documents.
          </div>
        )}
      </div>
    </div>
  );
}
