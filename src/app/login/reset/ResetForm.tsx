"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/AppShell";
import { Button, ErrorText, Input, Field } from "@/components/ui";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getMessages, type Locale } from "@/lib/i18n";

export default function ResetForm({ locale, token }: { locale: Locale; token: string }) {
  const t = getMessages(locale);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setError(t.login.passwordMismatch);
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t.login.resetInvalid);
      return;
    }
    setDone(true);
  }

  return (
    <div className="relative flex min-h-full items-center justify-center bg-mist px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-600/15 blur-3xl" />
      </div>
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <div>
            <BrandLogo className="h-16 w-auto max-w-[210px]" />
            <p className="mt-1 text-xs text-navy/50">{t.login.resetTitle}</p>
          </div>
          <LocaleSwitcher locale={locale} />
        </div>
        <div className="space-y-4 p-8">
          {!token ? (
            <p className="text-sm text-navy/80">{t.login.resetInvalid}</p>
          ) : done ? (
            <p className="text-sm text-navy/80">{t.login.resetSuccess}</p>
          ) : (
            <>
              <Field label={t.login.password}>
                <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
              </Field>
              <Field label={t.login.confirmPassword}>
                <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
              </Field>
              <ErrorText message={error} />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.login.resetSaving : t.login.resetSubmit}
              </Button>
            </>
          )}
          <Link href="/login" className="block text-center text-sm text-amber-700 hover:underline">
            {t.login.backToLogin}
          </Link>
        </div>
      </form>
    </div>
  );
}
