import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { vehicleSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      clients: { include: { client: true } },
      photos: { orderBy: { createdAt: "desc" } },
      estimates: {
        orderBy: { date: "desc" },
        include: { client: true, estimator: true },
      },
    },
  });
  if (!vehicle) return jsonError("Véhicule introuvable", 404);
  return NextResponse.json(vehicle);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = vehicleSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");
  const { clientIds, clientRoles, firstRegistration, vin, ...rest } = parsed.data;

  const vehicle = await prisma.$transaction(async (tx) => {
    await tx.clientVehicle.deleteMany({ where: { vehicleId: id } });
    return tx.vehicle.update({
      where: { id },
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
  });
  await writeAudit(session, "Vehicle", id, "UPDATE");
  return NextResponse.json(vehicle);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const { id } = await params;
  const estimates = await prisma.estimate.count({ where: { vehicleId: id } });
  if (estimates > 0) {
    return jsonError("Impossible de supprimer un véhicule lié à des devis.");
  }
  await prisma.vehicle.delete({ where: { id } });
  await writeAudit(session, "Vehicle", id, "DELETE");
  return NextResponse.json({ ok: true });
}
