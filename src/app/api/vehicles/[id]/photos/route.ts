import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return jsonError("Véhicule introuvable", 404);

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return jsonError("Aucune photo");

  const dir = path.join(process.cwd(), "public", "uploads", "vehicles", id);
  await mkdir(dir, { recursive: true });
  const created = [];
  for (const file of files) {
    const ext = path.extname(file.name) || ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buf);
    const rel = `/uploads/vehicles/${id}/${filename}`;
    created.push(
      await prisma.vehiclePhoto.create({
        data: { vehicleId: id, filename: file.name, path: rel },
      }),
    );
  }
  await writeAudit(session, "Vehicle", id, "PHOTO_UPLOAD", { count: created.length });
  return NextResponse.json(created, { status: 201 });
}
