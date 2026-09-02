import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { LOCALE_COOKIE, localeFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = localeFromCookie((await cookies()).get(LOCALE_COOKIE)?.value);
  return (
    <AppShell user={session} locale={locale}>
      {children}
    </AppShell>
  );
}
