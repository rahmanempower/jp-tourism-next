// app/super-admin/layout.js
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth.js";
import AppShell from "@/components/layout/AppShell";

export const metadata = { title: "Super Admin · JP Tourism" };

export default async function SuperAdminLayout({ children }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");

  const user = {
    id: session.id,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
