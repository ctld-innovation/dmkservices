import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAdmin, canWrite, getSession, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { DEFAULT_PANELS } from "@/lib/constants";
import { syncVehicleCatalogLookups } from "@/lib/vehicleLookups";
import { syncPanelLookups } from "@/lib/panelLookups";
import { remapDiagramMapsForRenamedPanel, unmapDiagramMapsForPanel, type DiagramMaps } from "@/lib/diagram";

async function saveDiagramMaps(maps: DiagramMaps) {
  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: { carDiagramMaps: maps },
    create: { id: "default", name: "DMK Services", carDiagramMaps: maps },
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await syncVehicleCatalogLookups();
  await syncPanelLookups();
  const items = await prisma.lookupValue.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();
  const body = await req.json().catch(() => null);
  if (!body?.category || !body?.label) return jsonError("Catégorie et libellé requis");
  const label = String(body.label).trim();
  const existing = await prisma.lookupValue.findFirst({
    where: { category: body.category, label },
  });
  if (existing) {
    if (existing.active) return jsonError("Cette pièce existe déjà");
    const restored = await prisma.lookupValue.update({
      where: { id: existing.id },
      data: { active: true, value: body.value || label },
    });
    return NextResponse.json(restored);
  }
  const max = await prisma.lookupValue.aggregate({
    where: { category: body.category },
    _max: { sortOrder: true },
  });
  const item = await prisma.lookupValue.create({
    data: {
      category: body.category,
      label,
      value: body.value || label,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const body = await req.json().catch(() => null);
  if (!body?.id) return jsonError("ID requis");
  const current = await prisma.lookupValue.findUnique({ where: { id: body.id } });
  if (!current) return jsonError("Pièce introuvable", 404);
  const data: {
    label?: string;
    value?: string;
    active?: boolean;
    sortOrder?: number;
  } = {};
  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (!label) return jsonError("Libellé requis");
    const duplicate = await prisma.lookupValue.findFirst({
      where: { category: current.category, label, id: { not: current.id } },
    });
    if (duplicate) return jsonError("Cette pièce existe déjà");
    data.label = label;
    if (current.category === "PANEL") {
      data.value = DEFAULT_PANELS.includes(current.value) ? current.value : label;
    } else if (body.value !== undefined) {
      data.value = body.value;
    } else {
      data.value = label;
    }
  } else if (body.value !== undefined) {
    data.value = body.value;
  }
  if (body.active !== undefined) data.active = body.active;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
  const item = await prisma.lookupValue.update({
    where: { id: body.id },
    data,
  });
  if (current.category === "PANEL" && item.label !== current.label) {
    await prisma.estimateLineItem.updateMany({
      where: { panel: current.label },
      data: { panel: item.label },
    });
    const settings = await prisma.companySettings.findUnique({ where: { id: "default" } });
    await saveDiagramMaps(
      remapDiagramMapsForRenamedPanel(settings?.carDiagramMaps, item, current.label),
    );
  }
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const { id } = await req.json().catch(() => ({}));
  if (!id) return jsonError("ID requis");
  const item = await prisma.lookupValue.findUnique({ where: { id } });
  if (!item) return jsonError("Pièce introuvable", 404);
  if (item.category === "PANEL") {
    await prisma.lookupValue.update({ where: { id }, data: { active: false } });
    const settings = await prisma.companySettings.findUnique({ where: { id: "default" } });
    await saveDiagramMaps(unmapDiagramMapsForPanel(settings?.carDiagramMaps, id));
  } else {
    await prisma.lookupValue.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
