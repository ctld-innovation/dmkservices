import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAdmin, getSession, unauthorized, forbidden } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();

  const [users, clients, vehicles, photos, estimates, lineItems, settings, lookups, audits] =
    await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          active: true,
          createdAt: true,
        },
      }),
      prisma.client.findMany(),
      prisma.vehicle.findMany({ include: { clients: true } }),
      prisma.vehiclePhoto.findMany(),
      prisma.estimate.findMany(),
      prisma.estimateLineItem.findMany(),
      prisma.companySettings.findMany(),
      prisma.lookupValue.findMany(),
      prisma.auditLog.findMany({ take: 500, orderBy: { createdAt: "desc" } }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    users,
    clients,
    vehicles,
    photos,
    estimates,
    lineItems,
    settings,
    lookups,
    audits,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="dmk-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
