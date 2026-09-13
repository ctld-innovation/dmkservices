import { cookies } from "next/headers";
import ResetForm from "./ResetForm";
import { LOCALE_COOKIE, localeFromCookie } from "@/lib/i18n";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const locale = localeFromCookie((await cookies()).get(LOCALE_COOKIE)?.value);
  const { token } = await searchParams;
  return <ResetForm locale={locale} token={token ?? ""} />;
}
