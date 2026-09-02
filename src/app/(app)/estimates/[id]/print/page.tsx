import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/PrintButton";
import { EstimateDocument } from "@/components/EstimateDocument";

export default async function PrintEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      client: true,
      vehicle: true,
      estimator: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!estimate) notFound();
  const [settings, photos, lookups] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    estimate.includePhotos
      ? prisma.vehiclePhoto.findMany({ where: { vehicleId: estimate.vehicleId } })
      : Promise.resolve([]),
    prisma.lookupValue.findMany({ where: { category: "PANEL", active: true } }),
  ]);

  return (
    <div className="print-sheet mx-auto max-w-[210mm] bg-white p-8 text-black print:max-w-none print:p-[16mm]">
      <div className="no-print mb-4 flex gap-2">
        <PrintButton />
        <a href={`/estimates/${id}`} className="btn btn-ghost">
          Retour
        </a>
        <a href={`/api/estimates/${id}/pdf`} className="btn btn-navy" target="_blank" rel="noreferrer">
          Télécharger PDF
        </a>
      </div>
      <EstimateDocument estimate={estimate} settings={settings} photos={photos} lookups={lookups} />
    </div>
  );
}
