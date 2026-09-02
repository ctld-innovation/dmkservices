import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { nextEstimateNumber } from "@/lib/numbering";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const { id } = await params;
  const source = await prisma.estimate.findUnique({
    where: { id },
    include: { lineItems: true },
  });
  if (!source) return jsonError("Devis introuvable", 404);

  const number = await nextEstimateNumber();
  const copy = await prisma.estimate.create({
    data: {
      number,
      date: new Date(),
      damageDate: source.damageDate,
      clientId: source.clientId,
      vehicleId: source.vehicleId,
      estimatorId: session.id,
      status: "DRAFT",
      discountType: source.discountType,
      discountValue: source.discountValue,
      taxRate: source.taxRate,
      internalNotes: source.internalNotes,
      clientNotes: source.clientNotes,
      includePhotos: source.includePhotos,
      lineItems: {
        create: source.lineItems.map((line) => ({
          sortOrder: line.sortOrder,
          panel: line.panel,
          damageType: line.damageType,
          repairMethod: line.repairMethod,
          severity: line.severity,
          dentCount: line.dentCount,
          laborHours: line.laborHours,
          laborRate: line.laborRate,
          partsCost: line.partsCost,
          paintCost: line.paintCost,
          lineTotal: line.lineTotal,
        })),
      },
      statusLogs: {
        create: {
          toStatus: "DRAFT",
          userId: session.id,
          note: `Duplication de ${source.number}`,
        },
      },
    },
  });
  await writeAudit(session, "Estimate", copy.id, "DUPLICATE", { from: source.number });
  return NextResponse.json(copy, { status: 201 });
}
