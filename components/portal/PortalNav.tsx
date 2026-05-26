"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, Menu, X } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const accessibleModules = PORTAL_MODULES.filter(m => permissions[m.id]?.canAccess);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/portal/login");
    router.refresh();
  }

  const navLinks = [
    { href: "/portal/dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} />, exact: true },
    ...accessibleModules.map(mod => ({
      href: mod.href,
      label: mod.label,
      icon: <span className="text-base leading-none">{MODULE_ICONS[mod.id]}</span>,
      exact: false,
    })),
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-4">
        {/* Brand */}
        <Link href="/portal/dashboard" className="flex items-center gap-2.5 shrink-0">
          <Image src="/cat-logo.png" alt="CAT INFONET" width={36} height={36} className="rounded-lg" priority />
          <div className="leading-tight hidden sm:block">
            <p className="text-sm font-bold text-gray-900">CAT INFONET</p>
            <p className="text-xs text-gray-400 -mt-0.5">Risk Portal</p>
          </div>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden sm:flex items-center gap-1 flex-1 overflow-x-auto">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                (link.exact ? pathname === link.href || pathname === "/portal" : pathname === link.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}>
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-gray-900">{userName}</p>
            <p className="text-xs text-gray-400 capitalize">{userRole}</p>
          </div>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
            {userName?.[0]?.toUpperCase()}
          </div>
          <button onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign out">
            <LogOut size={16} />
          </button>
          {/* Mobile menu toggle */}
          <button
            className="sm:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                (link.exact ? pathname === link.href || pathname === "/portal" : pathname === link.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              )}>
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
