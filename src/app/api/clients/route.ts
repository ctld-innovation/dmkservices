import { NextRequest, NextResponse } from "next/server";
import type { ClientType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { clientSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";
import { pagination } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const url = req.nextUrl;
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type") as ClientType | null;
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? 12);

  const where: Prisma.ClientWhereInput = {};
  if (type) where.type = type;
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { companyName: { contains: q } },
      { email: { contains: q } },
      { city: { contains: q } },
      { taxId: { contains: q } },
    ];
  }

  const total = await prisma.client.count({ where });
  const pager = pagination(total, page, pageSize);
  const items = await prisma.client.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    skip: pager.skip,
    take: pager.pageSize,
    include: {
      _count: { select: { estimates: true, vehicleLinks: true } },
    },
  });

  return NextResponse.json({ items, ...pager });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");
  }

  const client = await prisma.client.create({
    data: {
      ...parsed.data,
      email: parsed.data.email?.toLowerCase() || null,
      createdById: session.id,
      updatedById: session.id,
    },
  });
  await writeAudit(session, "Client", client.id, "CREATE", { name: parsed.data.lastName });
  return NextResponse.json(client, { status: 201 });
}
