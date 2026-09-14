import { prisma } from "@/lib/prisma";
import { catalogPanelName, DEFAULT_PANELS } from "@/lib/constants";

const OLD_HATCH = "Coffre / hayon";
const UPPER_HATCH = "Coffre supérieur";

function catalogKey(item: { label: string; value: string }) {
  return catalogPanelName(item.label) ?? catalogPanelName(item.value);
}

export async function syncPanelLookups() {
  const existing = await prisma.lookupValue.findMany({
    where: { category: "PANEL" },
    select: { id: true, label: true, value: true, sortOrder: true, active: true },
  });
  const byLabel = new Map(existing.map((item) => [item.label, item]));

  const oldHatch = byLabel.get(OLD_HATCH);
  if (oldHatch && !byLabel.has(UPPER_HATCH)) {
    const updated = await prisma.lookupValue.update({
      where: { id: oldHatch.id },
      data: { label: UPPER_HATCH, value: UPPER_HATCH, active: true },
    });
    byLabel.delete(OLD_HATCH);
    byLabel.set(UPPER_HATCH, updated);
  } else if (oldHatch) {
    await prisma.lookupValue.update({
      where: { id: oldHatch.id },
      data: { active: false },
    });
  }

  await prisma.estimateLineItem.updateMany({
    where: { panel: OLD_HATCH },
    data: { panel: UPPER_HATCH },
  });

  // Ne pas recréer un panneau déjà présent (inactif ou renommé, via label ou value).
  const covered = new Set(
    existing.flatMap((item) => {
      const key = catalogKey(item);
      return key ? [key] : [];
    }),
  );
  const missing = DEFAULT_PANELS.filter((label) => !covered.has(label) && !byLabel.has(label));
  if (missing.length) {
    await prisma.lookupValue.createMany({
      data: missing.map((label) => ({
        category: "PANEL",
        label,
        value: label,
        sortOrder: Math.max(0, DEFAULT_PANELS.indexOf(label)),
        active: true,
      })),
    });
  }

  const current = await prisma.lookupValue.findMany({
    where: { category: "PANEL" },
    select: { id: true, label: true, value: true, sortOrder: true },
  });
  const orderUpdates = current.flatMap((item) => {
    const key = catalogKey(item);
    if (!key) return [];
    const sortOrder = DEFAULT_PANELS.indexOf(key);
    return item.sortOrder === sortOrder ? [] : [{ id: item.id, sortOrder }];
  });
  if (orderUpdates.length) {
    await prisma.$transaction(
      orderUpdates.map((item) =>
        prisma.lookupValue.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }
}
