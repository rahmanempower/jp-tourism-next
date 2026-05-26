// app/admin/layout.js
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth.js";
import AppShell from "@/components/layout/AppShell";

export const metadata = { title: "Admin · JP Tourism" };

export default async function AdminLayout({ children }) {
  const session = await getSession();
  const allowed = ["SUPER_ADMIN", "ADMIN"];
  if (!session || !allowed.includes(session.role)) redirect("/login");

  const user = {
    id: session.id,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
