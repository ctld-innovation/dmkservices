import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { canAdmin, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Logo manquant");
  const ext = path.extname(file.name) || ".png";
  const dir = path.join(process.cwd(), "public", "uploads", "branding");
  await mkdir(dir, { recursive: true });
  const filename = `logo${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  const logoPath = `/uploads/branding/${filename}`;
  const settings = await prisma.companySettings.upsert({
    where: { id: "default" },
    update: { logoPath },
    create: { id: "default", name: "DMK Services", logoPath },
  });
  return NextResponse.json(settings);
}
