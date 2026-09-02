import { NextResponse } from "next/server";
import type { EstimateStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const STATUSES = new Set(["DRAFT", "SENT", "APPROVED", "REJECTED", "INVOICED"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = body?.status as EstimateStatus;
  if (!STATUSES.has(status)) return jsonError("Statut invalide");
  const existing = await prisma.estimate.findUnique({ where: { id } });
  if (!existing) return jsonError("Devis introuvable", 404);

  const updated = await prisma.estimate.update({
    where: { id },
    data: {
      status,
      statusLogs: {
        create: {
          fromStatus: existing.status,
          toStatus: status,
          userId: session.id,
          note: body?.note || null,
        },
      },
    },
  });
  await writeAudit(session, "Estimate", id, "STATUS", { from: existing.status, to: status });
  return NextResponse.json(updated);
}
