import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { ensureLaborRates } from "@/lib/laborRates";

const rateSchema = z.object({
  label: z.string().min(1, "Libellé requis"),
  amount: z.coerce.number().min(0),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await ensureLaborRates();
  const items = await prisma.laborRate.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const parsed = rateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");
  const max = await prisma.laborRate.aggregate({ _max: { sortOrder: true } });
  const item = await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) {
      await tx.laborRate.updateMany({ data: { isDefault: false } });
      await tx.companySettings.upsert({
        where: { id: "default" },
        update: { defaultLaborRate: parsed.data.amount },
        create: { id: "default", name: "DMK Services", defaultLaborRate: parsed.data.amount },
      });
    }
    return tx.laborRate.create({
      data: {
        label: parsed.data.label,
        amount: parsed.data.amount,
        isDefault: parsed.data.isDefault ?? false,
        active: parsed.data.active ?? true,
        sortOrder: parsed.data.sortOrder ?? (max._max.sortOrder ?? -1) + 1,
      },
    });
  });
  await writeAudit(session, "LaborRate", item.id, "CREATE", { label: item.label });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const body = await req.json().catch(() => null);
  if (!body?.id) return jsonError("ID requis");
  const parsed = rateSchema.partial().safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");
  const item = await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) {
      await tx.laborRate.updateMany({ where: { id: { not: body.id } }, data: { isDefault: false } });
    }
    const updated = await tx.laborRate.update({
      where: { id: body.id },
      data: parsed.data,
    });
    if (updated.isDefault && parsed.data.amount != null) {
      await tx.companySettings.upsert({
        where: { id: "default" },
        update: { defaultLaborRate: parsed.data.amount },
        create: { id: "default", name: "DMK Services", defaultLaborRate: parsed.data.amount },
      });
    }
    return updated;
  });
  await writeAudit(session, "LaborRate", item.id, "UPDATE");
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const { id } = await req.json().catch(() => ({}));
  if (!id) return jsonError("ID requis");
  const rate = await prisma.laborRate.findUnique({ where: { id } });
  if (!rate) return jsonError("Taux introuvable", 404);
  if (rate.isDefault) return jsonError("Impossible de supprimer le taux par défaut");
  await prisma.laborRate.delete({ where: { id } });
  await writeAudit(session, "LaborRate", id, "DELETE", { label: rate.label });
  return NextResponse.json({ ok: true });
}
