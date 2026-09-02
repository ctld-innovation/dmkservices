import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { vehicleSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";
import { pagination } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const where: Prisma.VehicleWhereInput = q
    ? {
        OR: [
          { licensePlate: { contains: q } },
          { vin: { contains: q } },
          { brand: { contains: q } },
          { model: { contains: q } },
        ],
      }
    : {};
  const total = await prisma.vehicle.count({ where });
  const pager = pagination(total, page, 12);
  const items = await prisma.vehicle.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: pager.skip,
    take: pager.pageSize,
    include: {
      clients: { include: { client: true } },
      _count: { select: { estimates: true, photos: true } },
    },
  });
  return NextResponse.json({ items, ...pager });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const body = await req.json().catch(() => null);
  const parsed = vehicleSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");

  const { clientIds, clientRoles, firstRegistration, vin, ...rest } = parsed.data;
  const vehicle = await prisma.vehicle.create({
    data: {
      ...rest,
      vin: vin.toUpperCase(),
      firstRegistration: firstRegistration ? new Date(firstRegistration) : null,
      clients: {
        create: clientIds.map((clientId) => ({
          clientId,
          role: clientRoles?.[clientId] || "OWNER",
        })),
      },
    },
    include: { clients: { include: { client: true } } },
  });
  await writeAudit(session, "Vehicle", vehicle.id, "CREATE", { vin: vehicle.vin });
  return NextResponse.json(vehicle, { status: 201 });
}
