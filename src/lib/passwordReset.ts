import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { loadCompanySettings, sendCompanyMail } from "@/lib/mail";

const RESET_TTL_MS = 2 * 60 * 60 * 1000;

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return token;
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashResetToken(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!row) return null;
  await prisma.passwordResetToken.delete({ where: { id: row.id } });
  if (row.expiresAt < new Date() || !row.user.active) return null;
  return row.user;
}

export async function issueAndSendPasswordReset(opts: {
  user: { id: string; email: string; firstName: string };
  origin: string;
}) {
  const settings = await loadCompanySettings();
  const token = await createPasswordResetToken(opts.user.id);
  const resetUrl = `${opts.origin}/login/reset?token=${encodeURIComponent(token)}`;
  const company = settings.name || "DMK Services";
  await sendCompanyMail(settings, {
    to: opts.user.email,
    subject: `Réinitialisation du mot de passe — ${company}`,
    text: [
      `Bonjour ${opts.user.firstName},`,
      "",
      `Une demande de réinitialisation de mot de passe a été effectuée pour votre compte ${company}.`,
      "Cliquez sur le lien suivant (valable 2 heures) :",
      resetUrl,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
      "",
      "Cordialement,",
      company,
    ].join("\n"),
  });
}
