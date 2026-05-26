// app/page.js — Root redirect
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth.js";

export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const map = {
    SUPER_ADMIN: "/super-admin/dashboard",
    ADMIN: "/admin/dashboard",
    VENDOR: "/vendor/dashboard",
    AGENCY_OWNER: "/agency/dashboard",
    AGENCY_STAFF: "/agency/dashboard",
  };
  redirect(map[session.role] ?? "/login");
}
