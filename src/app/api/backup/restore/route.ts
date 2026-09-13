import { NextResponse } from "next/server";
import { canAdmin, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  backupSummary,
  parseBackupPayload,
  readBackupSnapshot,
  restoreBackupPayload,
  saveBackupSnapshot,
} from "@/lib/backup";

export const maxDuration = 120;

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

async function payloadFromRequest(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const filename = String(body?.filename || "");
    if (!filename) throw new Error("Fichier serveur requis");
    return { payload: await readBackupSnapshot(filename), source: filename };
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Fichier JSON requis");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Fichier trop volumineux (max. 50 Mo)");
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(await file.text());
  } catch {
    throw new Error("Fichier JSON invalide");
  }
  return { payload: parseBackupPayload(parsedJson), source: file.name || "upload.json" };
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();

  let parsed: { payload: ReturnType<typeof parseBackupPayload>; source: string };
  try {
    parsed = await payloadFromRequest(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sauvegarde illisible";
    return jsonError(message);
  }

  try {
    const safety = await saveBackupSnapshot("prerestore");
    await restoreBackupPayload(parsed.payload, session);
    await writeAudit(session, "Backup", parsed.source, "RESTORE", {
      source: parsed.source,
      safety: safety.filename,
      ...backupSummary(parsed.payload),
    });
    return NextResponse.json({
      ok: true,
      source: parsed.source,
      safety: safety.filename,
      summary: backupSummary(parsed.payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restauration impossible";
    return jsonError(`Restauration impossible : ${message}`, 500);
  }
}
