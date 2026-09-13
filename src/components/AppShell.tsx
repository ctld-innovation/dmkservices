"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Car,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import { ROLES, labelOf } from "@/lib/constants";
import { getMessages, type Locale } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

/** Largeur d’une tablette en paysage : en dessous, le menu se replie tout seul. */
const TABLET_LANDSCAPE_MIN = 1024;

function isNarrowScreen() {
  return typeof window !== "undefined" && window.innerWidth < TABLET_LANDSCAPE_MIN;
}

export function AppShell({
  user,
  locale,
  children,
}: {
  user: SessionUser;
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = getMessages(locale);
  const NAV = [
    { href: "/", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/clients", label: t.nav.clients, icon: Users },
    { href: "/vehicles", label: t.nav.vehicles, icon: Car },
    { href: "/estimates", label: t.nav.estimates, icon: ClipboardList },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [narrow, setNarrow] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("dmk_nav_collapsed");
    if (stored === "1") setCollapsed(true);
    const mq = window.matchMedia(`(max-width: ${TABLET_LANDSCAPE_MIN - 1}px)`);
    const apply = () => {
      setNarrow(mq.matches);
      setOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  function toggleMenu() {
    if (isNarrowScreen()) {
      setOpen((value) => !value);
      return;
    }
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("dmk_nav_collapsed", next ? "1" : "0");
      return next;
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const showLabels = open || !collapsed;
  const rail = collapsed && !open;

  return (
    <div className="min-h-full bg-mist">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-white text-navy no-print",
          "transition-[width,transform] duration-200",
          rail ? "w-[4.5rem] lg:w-[4.5rem]" : "w-64",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className={cn("px-3 py-4", showLabels ? "px-4" : "px-2")}>
          {showLabels ? (
            <BrandLogo className="h-auto w-full max-w-[220px]" />
          ) : (
            <BrandLogo compact className="mx-auto h-8 w-8" />
          )}
          <div className={cn("mt-2 flex items-center", showLabels ? "justify-between" : "justify-center")}>
            {showLabels ? <p className="text-[11px] text-navy/50">{t.tagline}</p> : null}
            <button
              type="button"
              className="hidden rounded-lg p-1.5 text-navy hover:bg-mist lg:inline-flex"
              onClick={toggleMenu}
              aria-label={collapsed ? t.nav.expand : t.nav.collapse}
              title={collapsed ? t.nav.expand : t.nav.collapse}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <button
              type="button"
              className="rounded-lg p-1.5 text-navy hover:bg-mist lg:hidden"
              onClick={() => setOpen(false)}
              aria-label={t.nav.collapse}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <nav className={cn("flex-1 space-y-1", showLabels ? "px-3" : "px-2")}>
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                title={item.label}
                className={cn(
                  "flex items-center rounded-xl py-2.5 text-sm font-medium transition",
                  showLabels ? "gap-3 px-3" : "justify-center px-2",
                  active
                    ? "bg-mist text-amber-600 shadow-[inset_3px_0_0_0_#00d9f5]"
                    : "text-navy/70 hover:bg-mist hover:text-navy",
                )}
              >
                <Icon size={18} />
                {showLabels ? item.label : <span className="sr-only">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={cn("border-t border-line", showLabels ? "p-4" : "p-2")}>
          {showLabels ? (
            <>
              <Link
                href="/settings?tab=users"
                className="block text-sm font-medium text-navy hover:text-amber-700"
              >
                {user.firstName} {user.lastName}
              </Link>
              <div className="mt-1 flex items-center justify-between">
                <div className="text-xs text-navy/50">{labelOf(ROLES, user.role)}</div>
                <LocaleSwitcher locale={locale} />
              </div>
            </>
          ) : (
            <Link
              href="/settings?tab=users"
              className="mb-2 flex justify-center"
              title={`${user.firstName} ${user.lastName}`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-xs font-semibold text-navy">
                {user.firstName.charAt(0)}
                {user.lastName.charAt(0)}
              </span>
            </Link>
          )}
          <button
            onClick={logout}
            title={t.nav.logout}
            className={cn(
              "mt-3 flex items-center rounded-xl border border-line bg-mist py-2 text-sm text-navy hover:border-amber hover:bg-white",
              showLabels ? "w-full justify-center gap-2 px-3" : "mx-auto w-10 justify-center px-0",
            )}
          >
            <LogOut size={15} />
            {showLabels ? t.nav.logout : <span className="sr-only">{t.nav.logout}</span>}
          </button>
        </div>
      </aside>

      {open ? (
        <button
          className="no-print fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label={t.nav.collapse}
        />
      ) : null}

      <div
        className={cn(
          "print:pl-0 transition-[padding] duration-200",
          collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64",
        )}
      >
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={toggleMenu}
            aria-label={narrow ? (open ? t.nav.collapse : t.nav.expand) : collapsed ? t.nav.expand : t.nav.collapse}
            title={narrow ? (open ? t.nav.collapse : t.nav.expand) : collapsed ? t.nav.expand : t.nav.collapse}
          >
            {narrow ? (
              open ? <X size={18} /> : <Menu size={18} />
            ) : collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
          <BrandLogo compact className="h-8 w-8" />
          <span className="font-semibold text-navy">{t.appName}</span>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}

export function BrandLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={compact ? "/favicon.png" : "/branding/logo.png"}
      alt="DMK Services"
      className={cn("object-contain", compact ? "h-9 w-9" : "h-12 w-auto", className)}
    />
  );
}

export function LogoMark({ className }: { className?: string }) {
  return <BrandLogo compact className={className} />;
}
