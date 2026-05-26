// app/agency/crm/pipeline/page.js — Agency: Enquiry Pipeline (Kanban view)
import { getSession } from "@/lib/auth.js";
import prisma from "@/lib/prisma.js";

export const metadata = { title: "Pipeline · Agency · JP Tourism" };

const STAGES = [
  { key: "OPEN",          label: "Open",          color: "#06b6d4" },
  { key: "DRAFT_CREATED", label: "Draft Created",  color: "#6366f1" },
  { key: "QUOTED",        label: "Quoted",         color: "#f59e0b" },
  { key: "CONVERTED",     label: "Converted",      color: "#22c55e" },
  { key: "LOST",          label: "Lost",           color: "#ef4444" },
];

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";

export default async function AgencyPipelinePage() {
  const session = await getSession();
  if (!session?.agencyId) return null;

  const enquiries = await prisma.enquiry.findMany({
    where: { agencyId: session.agencyId },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { firstName: true, lastName: true } },
    },
  });

  // Group by status
  const grouped = Object.fromEntries(STAGES.map((s) => [s.key, []]));
  for (const e of enquiries) {
    if (grouped[e.status]) grouped[e.status].push(e);
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Enquiry Pipeline</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{enquiries.length} total enquiries</p>
      </div>

      <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "1rem", alignItems: "flex-start" }}>
        {STAGES.map((stage) => {
          const cards = grouped[stage.key] ?? [];
          return (
            <div
              key={stage.key}
              style={{
                minWidth: 240,
                flex: "0 0 240px",
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              {/* Column header */}
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid var(--card-border)",
                  background: `${stage.color}11`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: stage.color }}>{stage.label}</span>
                <span
                  style={{
                    background: `${stage.color}33`,
                    color: stage.color,
                    borderRadius: "20px",
                    padding: "1px 8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}
                >
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", minHeight: 80 }}>
                {cards.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      background: "#1a1f2e",
                      border: "1px solid #2a3050",
                      borderRadius: "10px",
                      padding: "0.75rem",
                    }}
                  >
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.3rem" }}>
                      {e.title}
                    </div>
                    {e.customer && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                        {e.customer.firstName} {e.customer.lastName}
                      </div>
                    )}
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{fmt(e.updatedAt)}</div>
                  </div>
                ))}
                {cards.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem", padding: "0.5rem" }}>
                    No enquiries
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
