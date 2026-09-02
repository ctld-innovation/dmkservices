import { prisma } from "@/lib/prisma";

export async function ensureLaborRates() {
  const count = await prisma.laborRate.count();
  if (count > 0) return;
  const settings = await prisma.companySettings.findUnique({ where: { id: "default" } });
  await prisma.laborRate.create({
    data: {
      label: "Taux standard",
      amount: settings?.defaultLaborRate ?? 75,
      isDefault: true,
      sortOrder: 0,
    },
  });
}
