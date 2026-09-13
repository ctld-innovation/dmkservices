import { cookies } from "next/headers";
import ForgotForm from "./ForgotForm";
import { LOCALE_COOKIE, localeFromCookie } from "@/lib/i18n";

export default async function Page() {
  const locale = localeFromCookie((await cookies()).get(LOCALE_COOKIE)?.value);
  return <ForgotForm locale={locale} />;
}
