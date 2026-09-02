"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  async function setLocale(next: Locale) {
    if (next === locale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 text-[11px] text-navy/45">
      <button
        type="button"
        className={locale === "fr" ? "font-semibold text-amber-600" : "hover:text-navy"}
        onClick={() => setLocale("fr")}
      >
        FR
      </button>
      <span>/</span>
      <button
        type="button"
        className={locale === "en" ? "font-semibold text-amber-600" : "hover:text-navy"}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
    </div>
  );
}
