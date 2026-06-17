"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Kanban, Settings, Zap, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { ANALYTICS_ROLES, PROSPECT_VIEW_ROLES, hasRoleAccess, type Role } from "@/lib/roles";
import type { ComponentType } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Kanban, label: "Pipeline", allowedRoles: PROSPECT_VIEW_ROLES },
  { href: "/admin/crm/analytics", icon: BarChart3, label: "Analytics", allowedRoles: ANALYTICS_ROLES },
  { href: "/settings", icon: Settings, label: "Settings", allowedRoles: PROSPECT_VIEW_ROLES },
];

type NavItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  allowedRoles: readonly Role[];
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const role = user?.role ?? "agent";
  const visibleNavItems = loading
    ? NAV_ITEMS
    : NAV_ITEMS.filter(({ allowedRoles }: NavItem) => hasRoleAccess(role, allowedRoles));

  return (
    <aside className="flex shrink-0 flex-col border-b border-ink-5 bg-surface-1 md:h-dvh md:w-[220px] md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-3 border-b border-ink-5 px-4 py-3 md:justify-start md:px-5 md:py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none text-ink-1">EduFlow</p>
            <p className="mt-0.5 font-mono text-[10px] text-ink-4">CRM · Internal</p>
          </div>
        </div>
        <div className="rounded-full border border-ink-5 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-ink-4 md:hidden">
          Nav
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:overflow-visible md:px-3 md:py-4 md:space-y-1">
        <p className="hidden px-2 pb-1 text-[10px] font-mono font-semibold uppercase tracking-widest text-ink-5 md:block">
          Menu
        </p>
        {loading ? (
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-ink-5">
            Loading menu...
          </div>
        ) : visibleNavItems.length > 0 ? visibleNavItems.map(({ href, icon: Icon, label }) => {
          const active = href === "/dashboard" ? pathname.startsWith("/dashboard") : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors md:w-full",
                active
                  ? "bg-brand-500/15 font-medium text-brand-400"
                  : "text-ink-4 hover:bg-surface-3 hover:text-ink-2"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        }) : (
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-ink-5">
            No menu available
          </div>
        )}
      </nav>

      <div className="mt-auto border-t border-ink-5 px-3 py-3">
        {user ? (
          <div className="flex items-center justify-between gap-3 md:flex-col md:items-stretch">
            <div className="flex min-w-0 items-center gap-2.5 px-1 md:px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800">
                <User className="h-3.5 w-3.5 text-brand-200" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-5">Signed in</p>
                <p className="truncate text-xs font-semibold text-ink-1">{user.name}</p>
                <p className="truncate font-mono text-[10px] text-ink-4">{user.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-ink-4 transition-colors hover:bg-danger-muted hover:text-danger md:w-full md:justify-center"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="px-2">
            <p className="font-mono text-[10px] text-ink-5">System 3 · Full Stack</p>
          </div>
        )}
      </div>
    </aside>
  );
}
