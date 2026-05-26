"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { PORTAL_MODULES, type PortalPermissions } from "@/lib/portal-modules";

interface PortalNavProps {
  userName: string;
  userRole: string;
  permissions: PortalPermissions;
}

const MODULE_ICONS: Record<string, string> = {
  assets: "🗄️", assess: "⚖️", controls: "🛡️", executive: "📊",
};

export default function PortalNav({ userName, userRole, permissions }: PortalNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const accessibleModules = PORTAL_MODULES.filter(m => permissions[m.id]?.canAccess);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/portal/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-6">
        {/* Brand */}
        <Link href="/portal/dashboard" className="flex items-center gap-2.5 shrink-0 mr-2">
          <Image src="/cat-logo.png" alt="CAT INFONET" width={40} height={40} className="rounded-lg" priority />
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900">CAT INFONET</p>
            <p className="text-xs text-gray-400 -mt-0.5">Risk Portal</p>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          <Link href="/portal/dashboard"
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              pathname === "/portal/dashboard" || pathname === "/portal"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}>
            <LayoutDashboard size={15} />
            Dashboard
          </Link>

          {accessibleModules.map(mod => (
            <Link key={mod.id} href={mod.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                pathname === mod.href
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}>
              <span className="text-base leading-none">{MODULE_ICONS[mod.id]}</span>
              {mod.label}
            </Link>
          ))}
        </nav>

        {/* User + logout */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{userName}</p>
            <p className="text-xs text-gray-400 capitalize">{userRole}</p>
          </div>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {userName?.[0]?.toUpperCase()}
          </div>
          <button onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
