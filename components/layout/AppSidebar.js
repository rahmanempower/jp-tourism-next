"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENUS, ROLE_META } from "./menuConfig";

export default function AppSidebar({ role }) {
  const pathname = usePathname();
  const items = MENUS[role] ?? [];
  const meta = ROLE_META[role] ?? ROLE_META.ADMIN;

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <i className="pi pi-send" />
        </div>
        <div>
          <div className="sidebar-logo-text">JP Tourism</div>
          <div className="sidebar-logo-sub">Travel Platform</div>
        </div>
      </div>

      {/* Role badge */}
      <div
        className="sidebar-role-badge"
        style={{ background: meta.bg, color: meta.color }}
      >
        {meta.label}
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav">
        {items.map((item, i) => {
          if (item.section) {
            return (
              <div key={`sec-${i}`} className="sidebar-section-label">
                {item.section}
              </div>
            );
          }

          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${isActive ? "active" : ""}`}
              style={isActive ? { "--sidebar-accent": meta.accent } : {}}
            >
              <i className={`${item.icon} sidebar-item-icon`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Version footer */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          fontSize: "0.65rem",
          color: "var(--text-muted)",
        }}
      >
        v1.0.0 · JP Tourism Platform
      </div>
    </aside>
  );
}
