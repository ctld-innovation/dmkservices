import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";
import { hashPassword, jsonError } from "@/lib/auth";
import { consumePasswordResetToken } from "@/lib/passwordReset";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");
  }

  const user = await consumePasswordResetToken(parsed.data.token);
  if (!user) return jsonError("Ce lien est invalide ou a expiré.", 400);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await writeAudit(null, "User", user.id, "PASSWORD_RESET");
  return NextResponse.json({ ok: true });
}
