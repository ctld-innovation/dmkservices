import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { jsonError } from "@/lib/auth";
import { requestOrigin } from "@/lib/mail";
import { issueAndSendPasswordReset } from "@/lib/passwordReset";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return jsonError("Email invalide");

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.active) {
    try {
      await issueAndSendPasswordReset({
        user: { id: user.id, email: user.email, firstName: user.firstName },
        origin: requestOrigin(req),
      });
      await writeAudit(null, "User", user.id, "PASSWORD_RESET_REQUEST");
    } catch {
      /* Ne pas révéler si le compte existe ou si SMTP est indisponible. */
    }
  }
  return NextResponse.json({ ok: true });
}
