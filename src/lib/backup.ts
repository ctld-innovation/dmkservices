import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { hashPassword, type SessionUser } from "@/lib/auth";

export const BACKUP_VERSION = 2;
const MAX_SERVER_BACKUPS = 30;
const DATE_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "date",
  "damageDate",
  "firstRegistration",
  "expiresAt",
]);

export type BackupPayload = {
  version: number;
  exportedAt: string;
  users: Array<Record<string, unknown>>;
  clients: Array<Record<string, unknown>>;
  vehicles: Array<Record<string, unknown>>;
  vehicleLinks: Array<Record<string, unknown>>;
  photos: Array<Record<string, unknown>>;
  estimates: Array<Record<string, unknown>>;
  lineItems: Array<Record<string, unknown>>;
  statusLogs: Array<Record<string, unknown>>;
  settings: Array<Record<string, unknown>>;
  lookups: Array<Record<string, unknown>>;
  laborRates: Array<Record<string, unknown>>;
  audits: Array<Record<string, unknown>>;
};

export type BackupSnapshot = {
  filename: string;
  size: number;
  savedAt: string;
};

const USER_KEYS = [
  "id",
  "email",
  "passwordHash",
  "firstName",
  "lastName",
  "role",
  "active",
  "createdAt",
  "updatedAt",
] as const;
const CLIENT_KEYS = [
  "id",
  "type",
  "companyName",
  "firstName",
  "lastName",
  "email",
  "phone",
  "mobile",
  "street",
  "city",
  "postalCode",
  "country",
  "taxId",
  "notes",
  "status",
  "discountPercent",
  "createdAt",
  "updatedAt",
  "createdById",
  "updatedById",
] as const;
const VEHICLE_KEYS = [
  "id",
  "licensePlate",
  "vin",
  "brand",
  "model",
  "year",
  "firstRegistration",
  "color",
  "mileage",
  "fuelType",
  "notes",
  "createdAt",
  "updatedAt",
] as const;
const LINK_KEYS = ["id", "clientId", "vehicleId", "role"] as const;
const PHOTO_KEYS = ["id", "vehicleId", "filename", "path", "caption", "createdAt"] as const;
const ESTIMATE_KEYS = [
  "id",
  "number",
  "date",
  "damageDate",
  "clientId",
  "vehicleId",
  "estimatorId",
  "status",
  "discountType",
  "discountValue",
  "taxRate",
  "internalNotes",
  "clientNotes",
  "includePhotos",
  "servicePricing",
  "dismantlingAmount",
  "applyVehiclePrep",
  "applyVehicleFinish",
  "createdAt",
  "updatedAt",
] as const;
const LINE_KEYS = [
  "id",
  "estimateId",
  "sortOrder",
  "panel",
  "damageType",
  "repairMethod",
  "severity",
  "dentCount",
  "dentSize",
  "orientation",
  "aluminum",
  "glue",
  "dap",
  "paintReserve",
  "extraWu",
  "laborHours",
  "laborRate",
  "laborRateId",
  "pricingMode",
  "fixedAmount",
  "partsCost",
  "paintCost",
  "lineTotal",
] as const;
const STATUS_LOG_KEYS = ["id", "estimateId", "fromStatus", "toStatus", "userId", "note", "createdAt"] as const;
const SETTINGS_KEYS = [
  "id",
  "name",
  "logoPath",
  "street",
  "city",
  "postalCode",
  "country",
  "phone",
  "email",
  "taxId",
  "defaultLaborRate",
  "defaultTaxRate",
  "estimatePrefix",
  "estimateSeqPad",
  "lastEstimateYear",
  "lastEstimateSeq",
  "carDiagram",
  "carDiagramMaps",
  "hagelExpert",
  "termsAndConditions",
  "smtpHost",
  "smtpPort",
  "smtpUser",
  "smtpPass",
  "smtpFrom",
  "smtpReplyTo",
] as const;
const LOOKUP_KEYS = ["id", "category", "label", "value", "sortOrder", "active"] as const;
const LABOR_KEYS = ["id", "label", "amount", "isDefault", "sortOrder", "active", "createdAt", "updatedAt"] as const;
const AUDIT_KEYS = ["id", "entity", "entityId", "action", "userId", "details", "createdAt"] as const;

export function backupDir() {
  return process.env.BACKUP_DIR?.trim() || path.join(process.cwd(), "data", "backups");
}

export function isSafeBackupFilename(name: string) {
  return /^dmk-backup-[a-z0-9.-]+\.json$/i.test(name);
}

export function backupFilename(kind: "manual" | "prerestore" = "manual") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return kind === "prerestore"
    ? `dmk-backup-avant-restauration-${stamp}.json`
    : `dmk-backup-${stamp}.json`;
}

async function ensureBackupDir() {
  await mkdir(backupDir(), { recursive: true });
}

function pick(row: Record<string, unknown>, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (row[key] !== undefined) out[key] = row[key];
  }
  return out;
}

function withDates(row: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...row };
  for (const [key, value] of Object.entries(out)) {
    if (!DATE_KEYS.has(key) || value == null || value === "") continue;
    out[key] = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  }
  return out;
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function datedRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => withDates(row));
}

function chunkRows<T>(rows: T[], size = 200) {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

function createManyOps(
  createMany: (args: { data: Array<Record<string, unknown>> }) => unknown,
  rows: Array<Record<string, unknown>>,
) {
  return chunkRows(datedRows(rows)).map((data) => createMany({ data }));
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [
    users,
    clients,
    vehiclesRaw,
    photos,
    estimates,
    lineItems,
    statusLogs,
    settings,
    lookups,
    laborRates,
    audits,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.client.findMany(),
    prisma.vehicle.findMany({ include: { clients: true } }),
    prisma.vehiclePhoto.findMany(),
    prisma.estimate.findMany(),
    prisma.estimateLineItem.findMany(),
    prisma.estimateStatusLog.findMany(),
    prisma.companySettings.findMany(),
    prisma.lookupValue.findMany(),
    prisma.laborRate.findMany(),
    prisma.auditLog.findMany({ take: 500, orderBy: { createdAt: "desc" } }),
  ]);

  const vehicleLinks = vehiclesRaw.flatMap((vehicle) => vehicle.clients);
  const vehicles = vehiclesRaw.map(({ clients: _clients, ...vehicle }) => vehicle);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    users: users as unknown as Array<Record<string, unknown>>,
    clients: clients as unknown as Array<Record<string, unknown>>,
    vehicles: vehicles as unknown as Array<Record<string, unknown>>,
    vehicleLinks: vehicleLinks as unknown as Array<Record<string, unknown>>,
    photos: photos as unknown as Array<Record<string, unknown>>,
    estimates: estimates as unknown as Array<Record<string, unknown>>,
    lineItems: lineItems as unknown as Array<Record<string, unknown>>,
    statusLogs: statusLogs as unknown as Array<Record<string, unknown>>,
    settings: settings as unknown as Array<Record<string, unknown>>,
    lookups: lookups as unknown as Array<Record<string, unknown>>,
    laborRates: laborRates as unknown as Array<Record<string, unknown>>,
    audits: audits as unknown as Array<Record<string, unknown>>,
  };
}

export function serializeBackup(payload: BackupPayload) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseBackupPayload(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== "object") throw new Error("Fichier de sauvegarde invalide");
  const data = raw as Record<string, unknown>;
  const vehicles = asRows(data.vehicles);
  const nestedLinks = vehicles.flatMap((vehicle) => asRows(vehicle.clients));
  const vehicleLinks = asRows(data.vehicleLinks).length ? asRows(data.vehicleLinks) : nestedLinks;
  return {
    version: Number(data.version) || 1,
    exportedAt: String(data.exportedAt || ""),
    users: asRows(data.users),
    clients: asRows(data.clients),
    vehicles: vehicles.map(({ clients: _clients, ...vehicle }) => vehicle),
    vehicleLinks,
    photos: asRows(data.photos),
    estimates: asRows(data.estimates),
    lineItems: asRows(data.lineItems),
    statusLogs: asRows(data.statusLogs),
    settings: asRows(data.settings),
    lookups: asRows(data.lookups),
    laborRates: asRows(data.laborRates),
    audits: asRows(data.audits),
  };
}

export function backupSummary(payload: BackupPayload) {
  return {
    exportedAt: payload.exportedAt || null,
    users: payload.users.length,
    clients: payload.clients.length,
    vehicles: payload.vehicles.length,
    estimates: payload.estimates.length,
  };
}

export async function listBackupSnapshots(): Promise<BackupSnapshot[]> {
  await ensureBackupDir();
  const dir = backupDir();
  const names = await readdir(dir);
  const items = await Promise.all(
    names
      .filter(isSafeBackupFilename)
      .map(async (filename) => {
        const info = await stat(path.join(dir, filename));
        return { filename, size: info.size, savedAt: info.mtime.toISOString() };
      }),
  );
  return items.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function saveBackupSnapshot(kind: "manual" | "prerestore" = "manual") {
  await ensureBackupDir();
  const payload = await buildBackupPayload();
  const filename = backupFilename(kind);
  await writeFile(path.join(backupDir(), filename), serializeBackup(payload), "utf8");
  await pruneBackupSnapshots();
  const info = await stat(path.join(backupDir(), filename));
  return { filename, size: info.size, savedAt: info.mtime.toISOString(), exportedAt: payload.exportedAt };
}

export async function readBackupSnapshot(filename: string) {
  if (!isSafeBackupFilename(filename)) throw new Error("Nom de fichier non autorisé");
  const full = path.join(backupDir(), filename);
  try {
    const raw = await readFile(full, "utf8");
    return parseBackupPayload(JSON.parse(raw));
  } catch (error) {
    if (error instanceof Error && error.message === "Fichier de sauvegarde invalide") throw error;
    throw new Error("Sauvegarde introuvable ou illisible");
  }
}

export async function readBackupFile(filename: string) {
  if (!isSafeBackupFilename(filename)) throw new Error("Nom de fichier non autorisé");
  const full = path.join(backupDir(), filename);
  const [content, info] = await Promise.all([readFile(full), stat(full)]);
  return { content, size: info.size };
}

export async function deleteBackupSnapshot(filename: string) {
  if (!isSafeBackupFilename(filename)) throw new Error("Nom de fichier non autorisé");
  await unlink(path.join(backupDir(), filename));
}

async function pruneBackupSnapshots() {
  const items = await listBackupSnapshots();
  const extra = items.slice(MAX_SERVER_BACKUPS);
  await Promise.all(extra.map((item) => unlink(path.join(backupDir(), item.filename)).catch(() => undefined)));
}

export async function restoreBackupPayload(payload: BackupPayload, session: SessionUser) {
  const currentUsers = await prisma.user.findMany();
  const byId = new Map(currentUsers.map((user) => [user.id, user]));
  const byEmail = new Map(currentUsers.map((user) => [user.email.toLowerCase(), user]));
  const fallbackHash = await hashPassword(randomBytes(32).toString("hex"));

  const users = (payload.users.length ? payload.users : currentUsers).map((row) => {
    const picked = pick(row as Record<string, unknown>, USER_KEYS);
    const id = String(picked.id || "");
    const email = String(picked.email || "").toLowerCase();
    const existing = byId.get(id) ?? byEmail.get(email);
    if (!picked.passwordHash) picked.passwordHash = existing?.passwordHash ?? fallbackHash;
    return picked;
  });

  if (!users.some((user) => user.id === session.id)) {
    const sameEmail = users.find(
      (user) => String(user.email || "").toLowerCase() === session.email.toLowerCase(),
    );
    if (sameEmail) {
      sameEmail.id = session.id;
    } else {
      const current = byId.get(session.id);
      if (current) users.push(pick(current as unknown as Record<string, unknown>, USER_KEYS));
    }
  }

  const userIds = new Set(users.map((user) => String(user.id)));
  const clients = payload.clients.map((row) => {
    const picked = pick(row, CLIENT_KEYS);
    if (picked.createdById && !userIds.has(String(picked.createdById))) picked.createdById = session.id;
    if (picked.updatedById && !userIds.has(String(picked.updatedById))) picked.updatedById = session.id;
    return picked;
  });
  const vehicles = payload.vehicles.map((row) => pick(row, VEHICLE_KEYS));
  const vehicleLinks = payload.vehicleLinks.map((row) => pick(row, LINK_KEYS));
  const photos = payload.photos.map((row) => pick(row, PHOTO_KEYS));
  const estimates = payload.estimates.map((row) => {
    const picked = pick(row, ESTIMATE_KEYS);
    if (!userIds.has(String(picked.estimatorId))) picked.estimatorId = session.id;
    return picked;
  });
  const lineItems = payload.lineItems.map((row) => pick(row, LINE_KEYS));
  const statusLogs = payload.statusLogs
    .map((row) => pick(row, STATUS_LOG_KEYS))
    .filter((row) => userIds.has(String(row.userId)));
  const lookups = payload.lookups.map((row) => pick(row, LOOKUP_KEYS));
  const laborRates = payload.laborRates.map((row) => pick(row, LABOR_KEYS));
  const settings = payload.settings.map((row) => pick(row, SETTINGS_KEYS));
  if (!settings.length) settings.push({ id: "default", name: "DMK Services" });
  const audits = payload.audits
    .map((row) => pick(row, AUDIT_KEYS))
    .map((row) => (row.userId && !userIds.has(String(row.userId)) ? { ...row, userId: null } : row));

  await prisma.$transaction(
    [
      prisma.estimateLineItem.deleteMany(),
      prisma.estimateStatusLog.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.vehiclePhoto.deleteMany(),
      prisma.clientVehicle.deleteMany(),
      prisma.estimate.deleteMany(),
      prisma.client.deleteMany(),
      prisma.vehicle.deleteMany(),
      prisma.lookupValue.deleteMany(),
      prisma.laborRate.deleteMany(),
      prisma.companySettings.deleteMany(),
      prisma.user.deleteMany(),
      ...createManyOps((args) => prisma.user.createMany({ data: args.data as never }), users),
      ...createManyOps(
        (args) => prisma.companySettings.createMany({ data: args.data as never }),
        settings,
      ),
      ...createManyOps((args) => prisma.lookupValue.createMany({ data: args.data as never }), lookups),
      ...createManyOps((args) => prisma.laborRate.createMany({ data: args.data as never }), laborRates),
      ...createManyOps((args) => prisma.client.createMany({ data: args.data as never }), clients),
      ...createManyOps((args) => prisma.vehicle.createMany({ data: args.data as never }), vehicles),
      ...createManyOps(
        (args) => prisma.clientVehicle.createMany({ data: args.data as never }),
        vehicleLinks,
      ),
      ...createManyOps((args) => prisma.vehiclePhoto.createMany({ data: args.data as never }), photos),
      ...createManyOps((args) => prisma.estimate.createMany({ data: args.data as never }), estimates),
      ...createManyOps(
        (args) => prisma.estimateLineItem.createMany({ data: args.data as never }),
        lineItems,
      ),
      ...createManyOps(
        (args) => prisma.estimateStatusLog.createMany({ data: args.data as never }),
        statusLogs,
      ),
      ...createManyOps((args) => prisma.auditLog.createMany({ data: args.data as never }), audits),
    ],
    { timeout: 120_000, maxWait: 15_000 },
  );
}
