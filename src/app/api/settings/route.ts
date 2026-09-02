import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAdmin, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { settingsSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const settings = await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "DMK Services" },
  });
  return NextResponse.json({ ...settings, smtpPass: settings.smtpPass ? "********" : "" });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");
  const data = { ...parsed.data };
  if (data.smtpPass === "********") delete (data as { smtpPass?: string }).smtpPass;
  const settings = await prisma.companySettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
  await writeAudit(session, "Settings", "default", "UPDATE");
  return NextResponse.json({ ...settings, smtpPass: settings.smtpPass ? "********" : "" });
}
