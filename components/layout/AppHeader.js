"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { OverlayPanel } from "primereact/overlaypanel";
import { ROLE_META } from "./menuConfig";

export default function AppHeader({ user, pageTitle = "Dashboard" }) {
  const router = useRouter();
  const menuRef = useRef(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const meta = ROLE_META[user?.role] ?? ROLE_META.ADMIN;
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="app-header">
      {/* Page title */}
      <div className="header-title">{pageTitle}</div>

      {/* Right actions */}
      <div className="header-actions">
        {/* Notifications bell */}
        <button className="header-icon-btn" title="Notifications">
          <i className="pi pi-bell" />
          <span className="notif-badge" />
        </button>

        {/* Help */}
        <button className="header-icon-btn" title="Help">
          <i className="pi pi-question-circle" />
        </button>

        {/* User chip */}
        <div
          className="user-chip"
          onClick={(e) => menuRef.current?.toggle(e)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && menuRef.current?.toggle(e)}
        >
          <div className="user-avatar" style={{ background: meta.accent }}>
            {initials}
          </div>
          <div>
            <div className="user-chip-name">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="user-chip-role">{meta.label}</div>
          </div>
          <i className="pi pi-chevron-down" style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: "0.25rem" }} />
        </div>

        {/* User dropdown */}
        <OverlayPanel
          ref={menuRef}
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "12px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            minWidth: "200px",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{user?.email}</div>
          </div>

          {[
            { icon: "pi-user", label: "My Profile", action: () => router.push(`/${user?.role?.toLowerCase().replace("_", "-")}/profile`) },
            { icon: "pi-cog", label: "Settings", action: () => {} },
          ].map((m) => (
            <div
              key={m.label}
              onClick={m.action}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.6rem 1rem",
                cursor: "pointer",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <i className={`pi ${m.icon}`} style={{ fontSize: "0.85rem" }} />
              {m.label}
            </div>
          ))}

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "0.25rem 0" }} />

          <div
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.6rem 1rem",
              cursor: "pointer",
              fontSize: "0.85rem",
              color: "#ef4444",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <i className="pi pi-sign-out" style={{ fontSize: "0.85rem" }} />
            {loggingOut ? "Logging out…" : "Logout"}
          </div>
        </OverlayPanel>
      </div>
    </header>
  );
}
