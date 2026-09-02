import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { EstimateForm } from "@/components/EstimateForm";

export default async function NewEstimatePage() {
  const session = await requireWriter();
  const [clients, vehicles, panels, settings] = await Promise.all([
    prisma.client.findMany({ where: { status: "ACTIVE" }, orderBy: { lastName: "asc" } }),
    prisma.vehicle.findMany({ include: { clients: true }, orderBy: { updatedAt: "desc" } }),
    prisma.lookupValue.findMany({ where: { category: "PANEL", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.companySettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", name: "DMK Services" },
    }),
  ]);
  return (
    <div>
      <PageHeader title="Nouveau devis" subtitle="Numérotation automatique EST-AAAA-XXXX" />
      <EstimateForm
        clients={clients}
        vehicles={vehicles}
        panels={panels.map((p) => p.label)}
        laborRate={settings.defaultLaborRate}
        taxRate={settings.defaultTaxRate}
        estimatorId={session!.id}
      />
    </div>
  );
}
