import { NextResponse } from "next/server";
import { canAdmin, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { buildBackupPayload, saveBackupSnapshot, serializeBackup } from "@/lib/backup";

export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();

  const payload = await buildBackupPayload();
  const body = serializeBackup(payload);
  const filename = `dmk-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  try {
    const snapshot = await saveBackupSnapshot("manual");
    await writeAudit(session, "Backup", snapshot.filename, "CREATE", snapshot);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sauvegarde impossible";
    return jsonError(message, 500);
  }
}
