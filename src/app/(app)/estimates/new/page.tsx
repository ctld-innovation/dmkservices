import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { EstimateForm } from "@/components/EstimateForm";
import { resolveDiagramPanelMap } from "@/lib/diagram";
import { resolveCarDiagram } from "@/lib/constants";
import { ensureLaborRates } from "@/lib/laborRates";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; vehicleId?: string }>;
}) {
  const session = await requireWriter();
  await ensureLaborRates();
  const sp = await searchParams;
  const [clients, vehicles, panels, settings, laborRates] = await Promise.all([
    prisma.client.findMany({ where: { status: "ACTIVE" }, orderBy: { lastName: "asc" } }),
    prisma.vehicle.findMany({ include: { clients: true }, orderBy: { updatedAt: "desc" } }),
    prisma.lookupValue.findMany({ where: { category: "PANEL", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.companySettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", name: "DMK Services" },
    }),
    prisma.laborRate.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
  ]);
  return (
    <div>
      <PageHeader title="Nouveau devis" subtitle="Numérotation automatique EST-AAAA-XXXX" />
      <EstimateForm
        clients={clients}
        vehicles={vehicles}
        panels={panels.map((p) => p.label)}
        laborRate={settings.defaultLaborRate}
        laborRates={laborRates}
        taxRate={settings.defaultTaxRate}
        estimatorId={session!.id}
        diagramStyle={resolveCarDiagram(settings.carDiagram)}
        panelMap={resolveDiagramPanelMap(
          settings.carDiagramMaps,
          resolveCarDiagram(settings.carDiagram),
          panels,
        )}
        initial={{
          clientId: sp.clientId,
          vehicleId: sp.vehicleId,
        }}
      />
    </div>
  );
}
