import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getUserPermissions } from "@/lib/portal-auth";
import PortalNav from "@/components/portal/PortalNav";

export default async function PortalMainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/portal/login");

  const permissions = getUserPermissions(session.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNav
        userName={session.name}
        userRole={session.role}
        permissions={permissions}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
