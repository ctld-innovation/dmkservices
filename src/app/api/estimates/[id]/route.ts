import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { estimateSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";
import { computeLineTotal, isMethodFixed, parseServicePricing } from "@/lib/calculations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      client: true,
      vehicle: { include: { photos: true, clients: { include: { client: true } } } },
      estimator: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      statusLogs: { orderBy: { createdAt: "desc" }, include: { user: true } },
    },
  });
  if (!estimate) return jsonError("Devis introuvable", 404);
  return NextResponse.json(estimate);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const { id } = await params;
  const existing = await prisma.estimate.findUnique({ where: { id } });
  if (!existing) return jsonError("Devis introuvable", 404);
  const body = await req.json().catch(() => null);
  const parsed = estimateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");
  const data = parsed.data;

  const estimate = await prisma.$transaction(async (tx) => {
    await tx.estimateLineItem.deleteMany({ where: { estimateId: id } });
    const updated = await tx.estimate.update({
      where: { id },
      data: {
        date: new Date(data.date),
        damageDate: data.damageDate ? new Date(data.damageDate) : null,
        clientId: data.clientId,
        vehicleId: data.vehicleId,
        estimatorId: data.estimatorId || existing.estimatorId,
        discountType: "PERCENT",
        discountValue: 0,
        taxRate: data.taxRate,
        internalNotes: data.internalNotes,
        clientNotes: data.clientNotes,
        includePhotos: data.includePhotos ?? false,
        dismantlingAmount: data.dismantlingAmount ?? 0,
        servicePricing: parseServicePricing(data.servicePricing),
        lineItems: {
          create: data.lineItems.map((line, idx) => {
            const { id: _lineId, ...rest } = line;
            void _lineId;
            const methodFixed = isMethodFixed(data.servicePricing, rest.repairMethod);
            return {
              ...rest,
              pricingMode: "HOURLY",
              fixedAmount: 0,
              sortOrder: rest.sortOrder ?? idx,
              lineTotal: computeLineTotal(rest, methodFixed),
            };
          }),
        },
      },
      include: { lineItems: true },
    });
    if (data.status && data.status !== existing.status) {
      await tx.estimate.update({ where: { id }, data: { status: data.status } });
      await tx.estimateStatusLog.create({
        data: {
          estimateId: id,
          fromStatus: existing.status,
          toStatus: data.status,
          userId: session.id,
        },
      });
    }
    return updated;
  });
  await writeAudit(session, "Estimate", id, "UPDATE");
  return NextResponse.json(estimate);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const { id } = await params;
  const existing = await prisma.estimate.findUnique({ where: { id } });
  if (!existing) return jsonError("Devis introuvable", 404);
  if (existing.status === "INVOICED") return jsonError("Un devis facturé ne peut pas être supprimé.");
  await prisma.estimate.delete({ where: { id } });
  await writeAudit(session, "Estimate", id, "DELETE", { number: existing.number });
  return NextResponse.json({ ok: true });
}
