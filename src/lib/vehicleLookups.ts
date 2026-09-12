import { prisma } from "@/lib/prisma";
import { VEHICLE_CATALOG } from "@/lib/vehicleCatalog";

function keyOf(value: string) {
  return value.trim().toLowerCase();
}

export async function syncVehicleCatalogLookups() {
  const existing = await prisma.lookupValue.findMany({
    where: { category: { in: ["BRAND", "MODEL"] } },
    select: { category: true, label: true, value: true },
  });
  const brands = new Set(
    existing.filter((item) => item.category === "BRAND").map((item) => keyOf(item.label)),
  );
  const models = new Set(
    existing
      .filter((item) => item.category === "MODEL")
      .map((item) => `${keyOf(item.value)}::${keyOf(item.label)}`),
  );

  const brandRows = Object.keys(VEHICLE_CATALOG)
    .filter((brand) => !brands.has(keyOf(brand)))
    .map((brand, index) => ({
      category: "BRAND",
      label: brand,
      value: brand,
      sortOrder: index,
    }));

  const modelRows: Array<{ category: string; label: string; value: string; sortOrder: number }> = [];
  let modelOrder = 0;
  for (const [brand, list] of Object.entries(VEHICLE_CATALOG)) {
    for (const model of list) {
      if (models.has(`${keyOf(brand)}::${keyOf(model)}`)) continue;
      modelRows.push({
        category: "MODEL",
        label: model,
        value: brand,
        sortOrder: modelOrder++,
      });
    }
  }

  if (brandRows.length) await prisma.lookupValue.createMany({ data: brandRows });
  if (modelRows.length) await prisma.lookupValue.createMany({ data: modelRows });
}

export async function ensureBrandModelLookups(brand: string, model: string) {
  const brandLabel = brand.trim();
  const modelLabel = model.trim();
  if (brandLabel) {
    const found = await prisma.lookupValue.findFirst({
      where: { category: "BRAND", label: brandLabel },
    });
    if (!found) {
      const max = await prisma.lookupValue.aggregate({
        where: { category: "BRAND" },
        _max: { sortOrder: true },
      });
      await prisma.lookupValue.create({
        data: {
          category: "BRAND",
          label: brandLabel,
          value: brandLabel,
          sortOrder: (max._max.sortOrder ?? -1) + 1,
        },
      });
    }
  }
  if (modelLabel) {
    const found = await prisma.lookupValue.findFirst({
      where: {
        category: "MODEL",
        label: modelLabel,
        value: brandLabel || modelLabel,
      },
    });
    if (!found) {
      const max = await prisma.lookupValue.aggregate({
        where: { category: "MODEL" },
        _max: { sortOrder: true },
      });
      await prisma.lookupValue.create({
        data: {
          category: "MODEL",
          label: modelLabel,
          value: brandLabel || modelLabel,
          sortOrder: (max._max.sortOrder ?? -1) + 1,
        },
      });
    }
  }
}
