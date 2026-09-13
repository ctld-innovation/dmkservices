import { NextResponse } from "next/server";
import { canAdmin, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { deleteBackupSnapshot, isSafeBackupFilename, readBackupFile } from "@/lib/backup";

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const { filename } = await params;
  const name = decodeURIComponent(filename);
  if (!isSafeBackupFilename(name)) return jsonError("Nom de fichier non autorisé");
  try {
    const { content } = await readBackupFile(name);
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch {
    return jsonError("Sauvegarde introuvable", 404);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const { filename } = await params;
  const name = decodeURIComponent(filename);
  if (!isSafeBackupFilename(name)) return jsonError("Nom de fichier non autorisé");
  try {
    await deleteBackupSnapshot(name);
    await writeAudit(session, "Backup", name, "DELETE");
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Sauvegarde introuvable", 404);
  }
}
