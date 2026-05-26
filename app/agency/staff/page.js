// app/agency/staff/page.js — Agency: Staff Management (AGENCY_OWNER only)
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Staff · Agency · JP Tourism" };

const ROLE_COLORS = {
  AGENCY_OWNER: "#6366f1",
  AGENCY_STAFF: "#06b6d4",
};

const badge = (label, color) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
    {label?.replace("_", " ")}
  </span>
);

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

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

export default async function AgencyStaffPage() {
  const session = await getSession();
  if (!session?.agencyId) return null;

  // Only AGENCY_OWNER may view this page
  if (session.role !== "AGENCY_OWNER") {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <i className="pi pi-lock" style={{ fontSize: "2rem", marginBottom: "1rem", display: "block", color: "#ef4444" }} />
        <p>Access restricted to Agency Owners.</p>
      </div>
    );
  }

  const staff = await prisma.user.findMany({
    where: { agencyId: session.agencyId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  const ownerCount = staff.filter((u) => u.role === "AGENCY_OWNER").length;
  const staffCount = staff.filter((u) => u.role === "AGENCY_STAFF").length;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Staff Management</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {staff.length} members · <span style={{ color: "#6366f1" }}>{ownerCount} owner{ownerCount !== 1 ? "s" : ""}</span> · <span style={{ color: "#06b6d4" }}>{staffCount} staff</span>
        </p>
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#1a1f2e" }}>
              <tr>
                <TH>Name</TH>
                <TH>Role</TH>
                <TH>Phone</TH>
                <TH>Active</TH>
                <TH>Email Verified</TH>
                <TH>Last Login</TH>
                <TH>Joined</TH>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id}>
                  <TD style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    <div>{u.firstName} {u.lastName}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.email}</div>
                  </TD>
                  <TD>{badge(u.role, ROLE_COLORS[u.role] ?? "#888")}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{u.phone ?? "—"}</TD>
                  <TD>
                    <span style={{ color: u.isActive ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </TD>
                  <TD>
                    <span style={{ color: u.isEmailVerified ? "#22c55e" : "#f59e0b" }}>
                      {u.isEmailVerified ? "Verified" : "Pending"}
                    </span>
                  </TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(u.lastLoginAt)}</TD>
                  <TD style={{ color: "var(--text-muted)" }}>{fmt(u.createdAt)}</TD>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No staff found.
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
