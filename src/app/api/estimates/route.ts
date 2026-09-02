import { NextRequest, NextResponse } from "next/server";
import type { EstimateStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { estimateSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";
import { pagination } from "@/lib/utils";
import { computeLineTotal, isMethodFixed, parseServicePricing } from "@/lib/calculations";
import { nextEstimateNumber } from "@/lib/numbering";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const status = req.nextUrl.searchParams.get("status") as EstimateStatus | null;
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const where: Prisma.EstimateWhereInput = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { number: { contains: q } },
      { client: { lastName: { contains: q } } },
      { client: { companyName: { contains: q } } },
      { vehicle: { licensePlate: { contains: q } } },
      { vehicle: { vin: { contains: q } } },
    ];
  }
  const total = await prisma.estimate.count({ where });
  const pager = pagination(total, page, 12);
  const items = await prisma.estimate.findMany({
    where,
    orderBy: { date: "desc" },
    skip: pager.skip,
    take: pager.pageSize,
    include: {
      client: true,
      vehicle: true,
      estimator: { select: { firstName: true, lastName: true } },
      lineItems: true,
    },
  });
  return NextResponse.json({ items, ...pager });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const body = await req.json().catch(() => null);
  const parsed = estimateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");

  const number = await nextEstimateNumber();
  const data = parsed.data;
  const estimate = await prisma.estimate.create({
    data: {
      number,
      date: new Date(data.date),
      damageDate: data.damageDate ? new Date(data.damageDate) : null,
      clientId: data.clientId,
      vehicleId: data.vehicleId,
      estimatorId: data.estimatorId || session.id,
      status: data.status ?? "DRAFT",
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
      statusLogs: {
        create: { toStatus: data.status ?? "DRAFT", userId: session.id, note: "Création du devis" },
      },
    },
    include: { lineItems: true, client: true, vehicle: true },
  });
  await writeAudit(session, "Estimate", estimate.id, "CREATE", { number });
  return NextResponse.json(estimate, { status: 201 });
}
