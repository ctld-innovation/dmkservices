import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAdmin, canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const items = await prisma.lookupValue.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const body = await req.json().catch(() => null);
  if (!body?.category || !body?.label) return jsonError("Catégorie et libellé requis");
  const max = await prisma.lookupValue.aggregate({
    where: { category: body.category },
    _max: { sortOrder: true },
  });
  const item = await prisma.lookupValue.create({
    data: {
      category: body.category,
      label: body.label,
      value: body.value || body.label,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const body = await req.json().catch(() => null);
  if (!body?.id) return jsonError("ID requis");
  const item = await prisma.lookupValue.update({
    where: { id: body.id },
    data: {
      label: body.label,
      value: body.value,
      active: body.active,
      sortOrder: body.sortOrder,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const { id } = await req.json().catch(() => ({}));
  if (!id) return jsonError("ID requis");
  await prisma.lookupValue.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
