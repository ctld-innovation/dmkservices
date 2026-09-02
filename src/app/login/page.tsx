import { cookies } from "next/headers";
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { LOCALE_COOKIE, localeFromCookie } from "@/lib/i18n";

export default async function Page() {
  const locale = localeFromCookie((await cookies()).get(LOCALE_COOKIE)?.value);
  return (
    <Suspense>
      <LoginForm locale={locale} />
    </Suspense>
  );
}
