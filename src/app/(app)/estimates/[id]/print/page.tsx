import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/calculations";
import { clientLabel, formatCurrency, formatDate, fullName, vehicleLabel } from "@/lib/utils";
import { DAMAGE_TYPES, REPAIR_METHODS, SEVERITIES, labelOf } from "@/lib/constants";
import { PrintButton } from "@/components/PrintButton";

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
  const settings = await prisma.companySettings.findUnique({ where: { id: "default" } });
  const photos = estimate.includePhotos
    ? await prisma.vehiclePhoto.findMany({ where: { vehicleId: estimate.vehicleId } })
    : [];
  const totals = computeTotals(
    estimate.lineItems,
    estimate.discountType,
    estimate.discountValue,
    estimate.taxRate,
  );

  return (
    <div className="print-sheet mx-auto max-w-[210mm] bg-white p-8 text-black">
      <div className="no-print mb-4 flex gap-2">
        <PrintButton />
        <a href={`/estimates/${id}`} className="btn btn-ghost">
          Retour
        </a>
      </div>
      <header className="mb-6 flex justify-between border-b-2 border-amber pb-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={settings?.logoPath || "/branding/logo.png"} alt="" className="mb-2 h-16 w-auto" />
          <h1 className="text-xl font-bold">{settings?.name}</h1>
          <p className="text-sm">
            {settings?.street}
            <br />
            {settings?.postalCode} {settings?.city}
            <br />
            {settings?.phone} · {settings?.email}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">DEVIS</div>
          <div className="text-amber-600 font-semibold">{estimate.number}</div>
          <div className="text-sm">Date : {formatDate(estimate.date)}</div>
        </div>
      </header>
      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg bg-mist p-3">
          <div className="mb-1 text-xs font-bold uppercase text-amber-600">Client</div>
          <div>{clientLabel(estimate.client)}</div>
          <div>{estimate.client.street}</div>
          <div>
            {estimate.client.postalCode} {estimate.client.city}
          </div>
        </div>
        <div className="rounded-lg bg-mist p-3">
          <div className="mb-1 text-xs font-bold uppercase text-amber-600">Véhicule</div>
          <div>{vehicleLabel(estimate.vehicle)}</div>
          <div>VIN {estimate.vehicle.vin}</div>
          <div>Estimateur : {fullName(estimate.estimator.firstName, estimate.estimator.lastName)}</div>
        </div>
      </div>
      <table className="table text-xs">
        <thead>
          <tr>
            <th>Pièce</th>
            <th>Dommage</th>
            <th>Méthode</th>
            <th>Sévérité</th>
            <th>Bosses</th>
            <th>H</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {estimate.lineItems.map((line) => (
            <tr key={line.id}>
              <td>{line.panel}</td>
              <td>{labelOf(DAMAGE_TYPES, line.damageType)}</td>
              <td>{labelOf(REPAIR_METHODS, line.repairMethod)}</td>
              <td>{labelOf(SEVERITIES, line.severity)}</td>
              <td>{line.dentCount}</td>
              <td>{line.laborHours}</td>
              <td>{formatCurrency(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-4 w-64 text-sm">
        <div className="flex justify-between">
          <span>Sous-total</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Remise</span>
          <span>-{formatCurrency(totals.discount)}</span>
        </div>
        <div className="flex justify-between">
          <span>TVA</span>
          <span>{formatCurrency(totals.tax)}</span>
        </div>
        <div className="mt-1 flex justify-between bg-amber px-2 py-1 font-bold text-navy">
          <span>Total TTC</span>
          <span>{formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>
      {estimate.clientNotes ? (
        <p className="mt-6 text-sm">
          <strong>Notes : </strong>
          {estimate.clientNotes}
        </p>
      ) : null}
      {settings?.termsAndConditions ? (
        <p className="mt-4 text-xs text-slate-600">{settings.termsAndConditions}</p>
      ) : null}
      <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-slate-500">
        <div className="h-24 border border-slate-300 p-2">Signature client</div>
        <div className="h-24 border border-slate-300 p-2">Cachet / signature DMK</div>
      </div>
      {photos.length ? (
        <div className="mt-8 grid grid-cols-2 gap-3">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.path} alt="" className="rounded border" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
