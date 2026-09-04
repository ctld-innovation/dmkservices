import { NextRequest, NextResponse } from "next/server";
import { readToken } from "@/lib/auth";

const PUBLIC = ["/api/auth/login", "/api/locale"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Contourne le handler cassé de Next : sert les copies dans public/media-next.
  if (pathname.startsWith("/_next/static/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/media-next${pathname}`;
    return NextResponse.rewrite(url);
  }

  if (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/media-next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/branding") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("dmk_session")?.value;
  const session = token ? await readToken(token) : null;

  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Inclure /_next/static pour le rewrite vers public/media-next
  matcher: ["/((?!_next/image|favicon.ico).*)"],
};
