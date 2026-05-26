// app/super-admin/settings/page.js — Platform Settings
export const metadata = { title: "Settings · Super Admin · JP Tourism" };

const SETTINGS = [
  {
    section: "Platform",
    items: [
      { key: "PLATFORM_COMMISSION_PERCENT", label: "Platform Commission (%)", value: "5", type: "number", description: "Commission taken from vendor price per booking." },
      { key: "DEFAULT_AGENCY_MARGIN", label: "Default Agency Margin (%)", value: "2", type: "number", description: "Default margin applied to new agencies." },
      { key: "DEFAULT_CREDIT_LIMIT", label: "Default Credit Limit ($)", value: "0", type: "number", description: "Default wallet credit limit for new agencies." },
    ],
  },
  {
    section: "Booking",
    items: [
      { key: "MAX_BOOKING_DAYS_AHEAD", label: "Max Booking Days Ahead", value: "365", type: "number", description: "Maximum number of days in advance a booking can be made." },
      { key: "AUTO_CANCEL_PENDING_HOURS", label: "Auto-Cancel Pending (hours)", value: "48", type: "number", description: "Hours before an unconfirmed pending booking is auto-cancelled." },
    ],
  },
  {
    section: "Notifications",
    items: [
      { key: "NOTIFY_ON_BOOKING", label: "Booking Notifications", value: "true", type: "boolean", description: "Send notifications to vendors and agencies on new bookings." },
      { key: "NOTIFY_ON_KYC_STATUS", label: "KYC Status Notifications", value: "true", type: "boolean", description: "Notify vendors when KYC status changes." },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Platform Settings</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Global configuration for the JP Tourism platform.
        </p>
      </div>

      <div
        style={{
          background: "#f59e0b22",
          border: "1px solid #f59e0b44",
          borderRadius: "10px",
          padding: "0.85rem 1.25rem",
          marginBottom: "1.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <i className="pi pi-info-circle" style={{ color: "#f59e0b", fontSize: "1.1rem" }} />
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Settings management via UI is coming soon. These values are currently configured through environment variables and seed data.
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {SETTINGS.map(({ section, items }) => (
          <div key={section} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--card-border)", background: "#1a1f2e" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {section}
              </h3>
            </div>
            <div style={{ padding: "0.5rem 0" }}>
              {items.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 140px",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem 1.25rem",
                    borderBottom: "1px solid var(--card-border)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: "0.88rem", marginBottom: "0.2rem" }}>{item.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.description}</div>
                    <code style={{ fontSize: "0.72rem", color: "#6366f1", background: "#6366f115", padding: "1px 6px", borderRadius: 4, marginTop: "0.25rem", display: "inline-block" }}>{item.key}</code>
                  </div>
                  <div
                    style={{
                      background: "#1a1f2e",
                      border: "1px solid #2a3050",
                      borderRadius: "8px",
                      padding: "0.5rem 0.85rem",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      textAlign: "center",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
