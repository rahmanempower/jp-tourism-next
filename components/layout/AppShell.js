"use client";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";

/**
 * AppShell — wraps sidebar + header + content area.
 * Used by every role layout as a Client Component so it can
 * receive the serialised user object from the Server layout.
 */
export default function AppShell({ user, pageTitle, children }) {
  return (
    <div className="app-shell">
      <AppSidebar role={user?.role} />
      <div className="app-main">
        <AppHeader user={user} pageTitle={pageTitle} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
