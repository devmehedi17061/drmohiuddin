"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ScrollText,
  Settings,
  Stethoscope,
  UserCog,
  Video,
  X,
} from "lucide-react";
import type { NavItem } from "@/lib/admin/nav";
import { logoutAction } from "@/lib/actions/admin/auth";
import { cn } from "@/lib/format";
import { LogoMark } from "@/components/ui/LogoMark";

const ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  settings: Settings,
  stethoscope: Stethoscope,
  chart: ChartNoAxesColumn,
  graduation: GraduationCap,
  building: Building2,
  image: ImageIcon,
  video: Video,
  help: HelpCircle,
  message: MessageSquare,
  calendar: CalendarDays,
  users: UserCog,
  log: ScrollText,
};

export function AdminShell({
  nav,
  user,
  siteName,
  logo,
  children,
}: {
  nav: NavItem[];
  user: { name: string; email: string; role: string };
  siteName: string;
  logo?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isCurrent = (href: string) =>
    href === "/admin-panel/dashboard" ? pathname === href : pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-900 text-brand-100">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <LogoMark logo={logo} siteName={siteName} tone="light" className="h-9" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">{siteName}</span>
          <span className="block text-xs text-brand-300">Control Panel</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {nav.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const current = isCurrent(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    current
                      ? "bg-white text-brand-800 shadow-sm"
                      : "text-brand-100 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-brand-300">{user.email}</p>
          <span className="mt-1.5 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[0.7rem] font-semibold text-brand-100">
            {user.role === "ADMIN" ? "Admin" : "Editor"}
          </span>
        </div>

        <div className="space-y-2">
          <Link
            href="/admin-panel/dashboard/profile"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-brand-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            <UserCog className="size-4" aria-hidden="true" />
            My Profile / Password
          </Link>

          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-brand-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View Main Site
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-rose-200 transition-colors hover:bg-rose-500/20 hover:text-white"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="hidden lg:block lg:h-screen lg:sticky lg:top-0">{sidebar}</aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-700"
            aria-label="Open Menu"
            title="Open Menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="truncate font-semibold text-slate-900">{siteName}</span>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -right-11 top-3 grid size-9 place-items-center rounded-lg bg-white text-slate-700"
              aria-label="Close Menu"
              title="Close Menu"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
