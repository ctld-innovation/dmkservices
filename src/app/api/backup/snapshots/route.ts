import { NextResponse } from "next/server";
import { canAdmin, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { listBackupSnapshots } from "@/lib/backup";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  try {
    const items = await listBackupSnapshots();
    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lecture des sauvegardes impossible";
    return jsonError(message, 500);
  }
}
