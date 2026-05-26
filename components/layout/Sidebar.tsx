"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, UserCheck, FolderKanban, FileText, LogOut,
  Shield, Database, Activity, BarChart3, ChevronDown, ScrollText,
  ClipboardList, Kanban, ClipboardCheck, Zap, Search, Settings, X,
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/dashboard",     label: "Dashboard",      icon: LayoutDashboard },
  { href: "/users",         label: "Users",           icon: Users },
  { href: "/consultants",   label: "Consultants",     icon: UserCheck },
  { href: "/projects",      label: "Projects",        icon: FolderKanban },
  { href: "/invoices",      label: "Invoices",        icon: FileText },
  { href: "/activity-logs", label: "Activity Logs",   icon: ScrollText },
];

const riskNav = [
  { href: "/risk-assessment",           label: "Overview",          icon: Shield },
  { href: "/risk-assessment/assets",    label: "1. Asset Register", icon: Database },
  { href: "/risk-assessment/assess",    label: "2. Risk Assess",    icon: Activity },
  { href: "/risk-assessment/controls",  label: "3. Controls",       icon: Shield },
  { href: "/risk-assessment/executive", label: "4. Dashboard",      icon: BarChart3 },
  { href: "/risk-treatment",            label: "5. Treatment Plan", icon: ClipboardList },
  { href: "/risk-treatment/kanban",     label: "   Kanban Board",   icon: Kanban },
];

export default function Sidebar({
  userName,
  userRole,
  onClose,
}: {
  userName: string;
  userRole: string;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const inRisk   = pathname.startsWith("/risk-assessment") || pathname.startsWith("/risk-treatment");
  const inGap    = pathname.startsWith("/gap-analysis");
  const inBia    = pathname.startsWith("/bia");
  const inAudit  = pathname.startsWith("/audit");
  const inAdmin  = pathname.startsWith("/admin");
  const [riskOpen, setRiskOpen] = useState(inRisk);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Routes that should only activate on exact path match (not startsWith)
  const EXACT_ONLY = new Set(["/risk-assessment", "/risk-treatment"]);

  function NavLink({ href, label, icon: Icon, indent = false }: { href: string; label: string; icon: any; indent?: boolean }) {
    const active = EXACT_ONLY.has(href)
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
    return (
      <Link href={href}
        className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
          indent && "pl-8 py-1.5",
          active ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
        )}>
        <Icon size={indent ? 14 : 18} />
        {label}
      </Link>
    );
  }

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen overflow-y-auto">
      <div className="p-5 border-b border-gray-700">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white rounded-xl p-1 shrink-0">
              <Image src="/cat-logo.png" alt="CAT INFONET" width={38} height={38} priority />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight">CAT INFONET</p>
              <p className="text-gray-400 text-xs">Admin Portal</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {mainNav.map(item => <NavLink key={item.href} {...item} />)}

        {/* GAP Analysis — standalone link */}
        <div className="pt-3">
          <Link
            href="/gap-analysis"
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              inGap
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            <ClipboardCheck size={18} />
            GAP Analysis
          </Link>
        </div>

        {/* BIA — standalone link */}
        <div className="pt-1">
          <Link
            href="/bia"
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              inBia
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            <Zap size={18} />
            BIA
          </Link>
        </div>

        {/* IT Audit — standalone link */}
        <div className="pt-1">
          <Link
            href="/audit"
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              inAudit
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            <Search size={18} />
            IT Audit
          </Link>
        </div>

        {/* Admin section — admin role only */}
        {userRole === "admin" && (
          <div className="pt-3">
            <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Admin
            </p>
            <Link
              href="/admin/frameworks"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mt-1",
                inAdmin
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Settings size={18} />
              Frameworks
            </Link>
          </div>
        )}

        {/* Risk Assessment section */}
        <div className="pt-3">
          <button
            onClick={() => setRiskOpen(o => !o)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              inRisk ? "bg-blue-900 text-blue-300" : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            <span className="flex items-center gap-3">
              <Shield size={18} />
              Risk Assessment
            </span>
            <ChevronDown size={14} className={cn("transition-transform", riskOpen && "rotate-180")} />
          </button>

          {riskOpen && (
            <div className="mt-1 space-y-0.5 border-l border-gray-700 ml-5">
              {riskNav.map(item => (
                <NavLink key={item.href} {...item} indent />
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
            {userName?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-gray-400 capitalize">{userRole}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
