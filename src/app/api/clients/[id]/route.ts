import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { clientSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      vehicleLinks: {
        include: { vehicle: { include: { _count: { select: { estimates: true } } } } },
      },
      estimates: {
        orderBy: { date: "desc" },
        include: { vehicle: true },
      },
      createdBy: { select: { firstName: true, lastName: true } },
      updatedBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!client) return jsonError("Client introuvable", 404);
  return NextResponse.json(client);
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
  const parsed = clientSchema.partial().safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");

  const client = await prisma.client.update({
    where: { id },
    data: { ...parsed.data, updatedById: session.id },
  });
  await writeAudit(session, "Client", id, "UPDATE");
  return NextResponse.json(client);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const { id } = await params;
  const estimates = await prisma.estimate.count({ where: { clientId: id } });
  if (estimates > 0) {
    return jsonError("Impossible de supprimer un client lié à des devis. Passez-le inactif.");
  }
  await prisma.client.delete({ where: { id } });
  await writeAudit(session, "Client", id, "DELETE");
  return NextResponse.json({ ok: true });
}
