import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAdmin, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { requestOrigin, smtpConfigured, loadCompanySettings } from "@/lib/mail";
import { issueAndSendPasswordReset } from "@/lib/passwordReset";
import { writeAudit } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, firstName: true, active: true },
  });
  if (!user) return jsonError("Utilisateur introuvable", 404);
  if (!user.active) return jsonError("Impossible d'envoyer un lien à un compte inactif");

  const settings = await loadCompanySettings();
  if (!smtpConfigured(settings)) {
    return jsonError("SMTP non configuré. Renseignez l'hôte et l'utilisateur dans Paramètres.");
  }

  try {
    await issueAndSendPasswordReset({
      user,
      origin: requestOrigin(req),
    });
  } catch {
    return jsonError("Envoi du lien impossible. Vérifiez la configuration SMTP.");
  }

  await writeAudit(session, "User", id, "PASSWORD_RESET_REQUEST", { byAdmin: true });
  return NextResponse.json({ ok: true });
}
