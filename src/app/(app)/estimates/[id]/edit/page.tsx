import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { EstimateForm } from "@/components/EstimateForm";

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireWriter();
  const [estimate, clients, vehicles, panels, settings] = await Promise.all([
    prisma.estimate.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.client.findMany({ orderBy: { lastName: "asc" } }),
    prisma.vehicle.findMany({ include: { clients: true } }),
    prisma.lookupValue.findMany({ where: { category: "PANEL", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.companySettings.findUnique({ where: { id: "default" } }),
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
        taxRate={settings?.defaultTaxRate ?? 20}
        estimatorId={session!.id}
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
          lineItems: estimate.lineItems,
        }}
      />
    </div>
  );
}
