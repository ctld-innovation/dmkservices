import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { buildEstimatePdf } from "@/lib/pdf";
import { writeAudit } from "@/lib/audit";
import { loadCompanySettings, sendCompanyMail, smtpConfigured } from "@/lib/mail";
import { estimateMailMessage, estimateMailSubject } from "@/lib/estimateMail";
import { estimatePdfFilename } from "@/lib/utils";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      client: true,
      vehicle: true,
      estimator: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!estimate) return jsonError("Devis introuvable", 404);
  const to = String(body.to || estimate.client.email || "").trim();
  if (!to) return jsonError("Aucune adresse email destinataire");
  const cc = String(body.cc || "")
    .split(/[,;]/)
    .map((addr: string) => addr.trim())
    .filter(Boolean)
    .join(", ");

  const [settings, photos, lookups] = await Promise.all([
    loadCompanySettings(),
    estimate.includePhotos
      ? prisma.vehiclePhoto.findMany({ where: { vehicleId: estimate.vehicleId } })
      : Promise.resolve([]),
    prisma.lookupValue.findMany({ where: { category: "PANEL", active: true } }),
  ]);
  if (!smtpConfigured(settings)) {
    return jsonError(
      "SMTP non configuré. Renseignez l'hôte et l'utilisateur dans Paramètres.",
    );
  }

  const subject =
    String(body.subject || "").trim() || estimateMailSubject(estimate.vehicle);
  const text =
    String(body.message || "").trim() ||
    estimateMailMessage(estimate.number, estimate.vehicle, settings.name);

  const pdf = await buildEstimatePdf(estimate, settings, photos, lookups);
  await sendCompanyMail(settings, {
    to,
    cc: cc || undefined,
    subject,
    text,
    attachments: [{ filename: estimatePdfFilename(estimate.vehicle.licensePlate), content: pdf }],
  });

  if (estimate.status === "DRAFT") {
    await prisma.estimate.update({
      where: { id },
      data: {
        status: "SENT",
        statusLogs: {
          create: {
            fromStatus: "DRAFT",
            toStatus: "SENT",
            userId: session.id,
            note: `Envoyé par email à ${to}${cc ? ` (cc ${cc})` : ""}`,
          },
        },
      },
    });
  }

  await writeAudit(session, "Estimate", id, "EMAIL", { to, cc: cc || undefined, subject });
  return NextResponse.json({ ok: true });
}
