import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { buildEstimatePdf } from "@/lib/pdf";
import { writeAudit } from "@/lib/audit";

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
  const to = body.to || estimate.client.email;
  if (!to) return jsonError("Aucune adresse email destinataire");

  const settings = await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "DMK Services" },
  });
  if (!settings.smtpHost || !settings.smtpUser) {
    return jsonError(
      "SMTP non configuré. Renseignez l'hôte et l'utilisateur dans Paramètres.",
    );
  }

  const photos = estimate.includePhotos
    ? await prisma.vehiclePhoto.findMany({ where: { vehicleId: estimate.vehicleId } })
    : [];
  const pdf = await buildEstimatePdf(estimate, settings, photos);
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: (settings.smtpPort || 587) === 465,
    auth: { user: settings.smtpUser, pass: settings.smtpPass || "" },
  });

  await transporter.sendMail({
    from: settings.smtpFrom || settings.smtpUser,
    to,
    subject: body.subject || `Devis ${estimate.number} — ${settings.name}`,
    text:
      body.message ||
      `Bonjour,\n\nVeuillez trouver ci-joint le devis ${estimate.number}.\n\nCordialement,\n${settings.name}`,
    attachments: [{ filename: `${estimate.number}.pdf`, content: pdf }],
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
            note: `Envoyé par email à ${to}`,
          },
        },
      },
    });
  }

  await writeAudit(session, "Estimate", id, "EMAIL", { to });
  return NextResponse.json({ ok: true });
}
