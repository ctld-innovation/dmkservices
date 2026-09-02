import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/auth";
import { computeTotals } from "@/lib/calculations";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const [clients, estimates, recent] = await Promise.all([
    prisma.client.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.estimate.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.estimate.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { client: true, vehicle: true, lineItems: true },
    }),
  ]);

  const recentWithTotals = recent.map((est) => ({
    ...est,
    totals: computeTotals(est.lineItems, est.discountType, est.discountValue, est.taxRate),
  }));

  const [clientCount, vehicleCount, estimateCount] = await Promise.all([
    prisma.client.count(),
    prisma.vehicle.count(),
    prisma.estimate.count(),
  ]);

  return NextResponse.json({
    clients,
    estimates,
    recent: recentWithTotals,
    counts: { clients: clientCount, vehicles: vehicleCount, estimates: estimateCount },
  });
}
