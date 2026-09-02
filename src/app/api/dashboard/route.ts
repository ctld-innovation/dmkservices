import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/auth";
import { computeEstimateTotals, sumEstimatesByStatus } from "@/lib/calculations";
import { ESTIMATE_STATUSES } from "@/lib/constants";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const [clients, allEstimates, recent] = await Promise.all([
    prisma.client.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.estimate.findMany({
      select: {
        status: true,
        discountType: true,
        discountValue: true,
        taxRate: true,
        servicePricing: true,
        dismantlingAmount: true,
        lineItems: {
          select: {
            laborHours: true,
            laborRate: true,
            partsCost: true,
            paintCost: true,
            lineTotal: true,
            repairMethod: true,
            pricingMode: true,
            fixedAmount: true,
          },
        },
      },
    }),
    prisma.estimate.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { client: true, vehicle: true, lineItems: true },
    }),
  ]);

  const byStatus = sumEstimatesByStatus(allEstimates);
  const statusTotals = ESTIMATE_STATUSES.map((s) => ({
    status: s.value,
    label: s.label,
    count: byStatus[s.value]?.count ?? 0,
    amount: byStatus[s.value]?.amount ?? 0,
  }));

  const recentWithTotals = recent.map((est) => ({
    ...est,
    totals: computeEstimateTotals(est),
  }));

  const [clientCount, vehicleCount, estimateCount] = await Promise.all([
    prisma.client.count(),
    prisma.vehicle.count(),
    prisma.estimate.count(),
  ]);

  return NextResponse.json({
    clients,
    estimates: statusTotals,
    statusTotals,
    recent: recentWithTotals,
    counts: { clients: clientCount, vehicles: vehicleCount, estimates: estimateCount },
  });
}
