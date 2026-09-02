import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAdmin, getSession, unauthorized, forbidden } from "@/lib/auth";
import { pagination } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const total = await prisma.auditLog.count();
  const pager = pagination(total, page, 30);
  const items = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    skip: pager.skip,
    take: pager.pageSize,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  return NextResponse.json({ items, ...pager });
}
