import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canAdmin, canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { settingsSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";
import type { z } from "zod";

function toPrismaSettingsData(data: Partial<z.infer<typeof settingsSchema>>) {
  const { carDiagramMaps, ...rest } = data;
  return {
    ...rest,
    ...(carDiagramMaps !== undefined
      ? { carDiagramMaps: carDiagramMaps === null ? Prisma.DbNull : carDiagramMaps }
      : {}),
  };
}

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
  const prismaData = toPrismaSettingsData(data);
  const settings = await prisma.companySettings.upsert({
    where: { id: "default" },
    update: prismaData,
    create: {
      ...prismaData,
      id: "default",
      name: prismaData.name ?? "DMK Services",
    },
  });
  await writeAudit(session, "Settings", "default", "UPDATE");
  return NextResponse.json({ ...settings, smtpPass: settings.smtpPass ? "********" : "" });
}
