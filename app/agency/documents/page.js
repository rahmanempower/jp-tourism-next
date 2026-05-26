// app/agency/documents/page.js — Agency: Documents
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Documents · Agency · JP Tourism" };

const REVIEW_COLORS = {
  PENDING:  "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label}
  </span>
);

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fileSize = (bytes) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

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

export default async function AgencyDocumentsPage() {
  const session = await getSession();
  if (!session?.agencyId) return null;

  const [documents, reviewGroups] = await Promise.all([
    prisma.document.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { uploadedAt: "desc" },
      take: 200,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        booking: { select: { bookingRef: true } },
      },
    }),
    prisma.document.groupBy({
      by: ["reviewStatus"],
      where: { agencyId: session.agencyId },
      _count: { _all: true },
    }),
  ]);

  const reviewMap = Object.fromEntries(reviewGroups.map((g) => [g.reviewStatus, g._count._all]));

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Documents</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{documents.length} documents across all bookings</p>
      </div>

      {/* Review status chips */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {Object.entries(REVIEW_COLORS).map(([s, color]) => (
          <div key={s} style={{ background: `${color}15`, border: `1px solid ${color}44`, borderRadius: 20, padding: "4px 14px", fontSize: "0.78rem", color }}>
            {s}: <strong>{reviewMap[s] ?? 0}</strong>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Document</TH>
                <TH>Type</TH>
                <TH>Customer</TH>
                <TH>Booking Ref</TH>
                <TH>Size</TH>
                <TH>Review Status</TH>
                <TH>Review Note</TH>
                <TH>Uploaded</TH>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <TD style={{ color: "var(--text-primary)", fontWeight: 500 }}>{doc.name}</TD>
                  <TD>
                    <span style={{ fontSize: "0.78rem", background: "#6366f122", color: "#a5b4fc", borderRadius: 4, padding: "2px 8px" }}>
                      {doc.type}
                    </span>
                  </TD>
                  <TD>
                    {doc.customer ? `${doc.customer.firstName} ${doc.customer.lastName}` : "—"}
                  </TD>
                  <TD style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6366f1" }}>
                    {doc.booking?.bookingRef ?? "—"}
                  </TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fileSize(doc.fileSizeBytes)}</TD>
                  <TD>{badge(doc.reviewStatus, REVIEW_COLORS[doc.reviewStatus] ?? "#888")}</TD>
                  <TD style={{ color: "var(--text-muted)", fontSize: "0.78rem", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {doc.reviewNote ?? "—"}
                  </TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(doc.uploadedAt)}</TD>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No documents found.
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
