import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/AdminShell";
import "../admin.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login?next=/admin");
  }

  return <AdminShell email={session.email}>{children}</AdminShell>;
}