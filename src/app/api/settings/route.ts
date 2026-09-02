import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAdmin, canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
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
  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.partial().safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");
  const data = { ...parsed.data };
  const keys = Object.keys(data);
  const writerTaxOnly =
    keys.length > 0 && keys.every((k) => k === "defaultTaxRate" || k === "defaultLaborRate");
  if (!canAdmin(session.role) && !(canWrite(session.role) && writerTaxOnly)) return forbidden();
  if (data.smtpPass === "********") delete (data as { smtpPass?: string }).smtpPass;
  const settings = await prisma.companySettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", name: "DMK Services", ...data },
  });
  await writeAudit(session, "Settings", "default", "UPDATE");
  return NextResponse.json({ ...settings, smtpPass: settings.smtpPass ? "********" : "" });
}
