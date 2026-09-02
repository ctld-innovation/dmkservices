import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const { id } = await params;
  const photo = await prisma.vehiclePhoto.findUnique({ where: { id } });
  if (!photo) return jsonError("Photo introuvable", 404);
  try {
    await unlink(path.join(process.cwd(), "public", photo.path.replace(/^\//, "")));
  } catch {
    /* file may already be gone */
  }
  await prisma.vehiclePhoto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
