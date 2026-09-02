"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/AppShell";
import { Button, ErrorText, Input, Field } from "@/components/ui";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getMessages, type Locale } from "@/lib/i18n";

export default function LoginForm({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t.login.error);
      return;
    }
    router.push(params.get("from") || "/");
    router.refresh();
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
            <p className="mt-1 text-xs text-navy/50">{t.tagline}</p>
          </div>
          <LocaleSwitcher locale={locale} />
        </div>
        <div className="space-y-4 p-8">
          <Field label={t.login.email}>
            <Input name="email" type="email" required autoComplete="username" />
          </Field>
          <Field label={t.login.password}>
            <Input name="password" type="password" required autoComplete="current-password" />
          </Field>
          <ErrorText message={error} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.login.loading : t.login.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
