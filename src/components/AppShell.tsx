"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Car,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import { ROLES, labelOf } from "@/lib/constants";
import { getMessages, type Locale } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-full bg-mist">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white text-navy transition-transform lg:translate-x-0",
          "no-print",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-4 py-4">
          <BrandLogo className="h-auto w-full max-w-[220px]" />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-navy/50">{t.tagline}</p>
            <button className="lg:hidden text-navy" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-mist text-amber-600 shadow-[inset_3px_0_0_0_#00d9f5]"
                    : "text-navy/70 hover:bg-mist hover:text-navy",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-4">
          <div className="text-sm font-medium text-navy">
            {user.firstName} {user.lastName}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-xs text-navy/50">{labelOf(ROLES, user.role)}</div>
            <LocaleSwitcher locale={locale} />
          </div>
          <button
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-mist px-3 py-2 text-sm text-navy hover:border-amber hover:bg-white"
          >
            <LogOut size={15} />
            {t.nav.logout}
          </button>
        </div>
      </aside>

      {open ? (
        <button
          className="no-print fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Fermer le menu"
        />
      ) : null}

      <div className="lg:pl-64 print:pl-0">
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button className="btn btn-ghost" onClick={() => setOpen(true)}>
            <Menu size={18} />
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
