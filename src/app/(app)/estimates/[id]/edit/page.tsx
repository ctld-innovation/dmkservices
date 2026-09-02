import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { EstimateForm } from "@/components/EstimateForm";
import { resolveDiagramPanelMap } from "@/lib/diagram";
import { resolveCarDiagram } from "@/lib/constants";
import { ensureLaborRates } from "@/lib/laborRates";

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireWriter();
  await ensureLaborRates();
  const [estimate, clients, vehicles, panels, settings, laborRates] = await Promise.all([
    prisma.estimate.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.client.findMany({ orderBy: { lastName: "asc" } }),
    prisma.vehicle.findMany({ include: { clients: true } }),
    prisma.lookupValue.findMany({ where: { category: "PANEL", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    prisma.laborRate.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
  ]);
  if (!estimate) notFound();

  return (
    <div>
      <PageHeader title={`Modifier ${estimate.number}`} />
      <EstimateForm
        id={id}
        clients={clients}
        vehicles={vehicles}
        panels={panels.map((p) => p.label)}
        laborRate={settings?.defaultLaborRate ?? 75}
        laborRates={laborRates}
        taxRate={settings?.defaultTaxRate ?? 20}
        estimatorId={session!.id}
        diagramStyle={resolveCarDiagram(settings?.carDiagram)}
        panelMap={resolveDiagramPanelMap(
          settings?.carDiagramMaps,
          resolveCarDiagram(settings?.carDiagram),
          panels,
        )}
        initial={{
          date: estimate.date,
          damageDate: estimate.damageDate,
          clientId: estimate.clientId,
          vehicleId: estimate.vehicleId,
          status: estimate.status,
          discountType: estimate.discountType,
          discountValue: estimate.discountValue,
          taxRate: estimate.taxRate,
          internalNotes: estimate.internalNotes,
          clientNotes: estimate.clientNotes,
          includePhotos: estimate.includePhotos,
          dismantlingAmount: estimate.dismantlingAmount,
          servicePricing: estimate.servicePricing,
          lineItems: estimate.lineItems,
        }}
      />
    </div>
  );
}
