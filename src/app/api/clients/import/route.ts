import { NextResponse } from "next/server";
import type { ClientType, ClientStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const TYPES = new Set(["WORKSHOP", "INTERMEDIARY", "INSURANCE", "FINAL_CLIENT"]);
const STATUSES = new Set(["ACTIVE", "INACTIVE"]);

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Fichier CSV manquant");
  const text = await file.text();
  const rows = parseCsv(text);
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const type = (row.type || "FINAL_CLIENT").toUpperCase();
    if (!TYPES.has(type) || !row.firstName || !row.lastName) {
      skipped++;
      continue;
    }
    const status = (row.status || "ACTIVE").toUpperCase();
    await prisma.client.create({
      data: {
        type: type as ClientType,
        companyName: row.companyName || null,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email || null,
        phone: row.phone || null,
        mobile: row.mobile || null,
        street: row.street || null,
        city: row.city || null,
        postalCode: row.postalCode || null,
        country: row.country || "France",
        taxId: row.taxId || null,
        notes: row.notes || null,
        status: (STATUSES.has(status) ? status : "ACTIVE") as ClientStatus,
        createdById: session.id,
        updatedById: session.id,
      },
    });
    created++;
  }

  await writeAudit(session, "Client", "bulk", "IMPORT", { created, skipped });
  return NextResponse.json({ created, skipped });
}
