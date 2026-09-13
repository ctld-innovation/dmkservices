import type { CompanySettings, Estimate, EstimateLineItem, Client, Vehicle, User, VehiclePhoto } from "@prisma/client";
import { computeEstimateTotalsWithSettings, isMethodFixed, estimateLineMethodFlags, METHOD_FLAG_COLUMNS, methodFlagMark, formatMethodLegend, formatLineExtraWu } from "@/lib/calculations";
import { EstimateTotalsPanels } from "@/components/EstimateTotalsPanels";
import { clientLabel, formatCurrency, formatDate, fullName } from "@/lib/utils";
import { sortByPanelOrder } from "@/lib/constants";
import { CarDiagramSvg } from "@/components/CarPanelPicker";
import { resolveDiagramPanelMap } from "@/lib/diagram";

type EstimateDoc = Estimate & {
  client: Client;
  vehicle: Vehicle;
  estimator: User;
  lineItems: EstimateLineItem[];
};

export function EstimateDocument({
  estimate,
  settings,
  photos = [],
  lookups = [],
}: {
  estimate: EstimateDoc;
  settings: CompanySettings | null;
  photos?: VehiclePhoto[];
  lookups?: Array<{ id: string; label: string }>;
}) {
  const totals = computeEstimateTotalsWithSettings(estimate, settings);
  const dentCounts: Record<string, number> = {};
  for (const line of estimate.lineItems) {
    if (!line.panel) continue;
    dentCounts[line.panel] = (dentCounts[line.panel] ?? 0) + (Number(line.dentCount) || 0);
  }
  const selectedPanels = [...new Set(estimate.lineItems.map((line) => line.panel).filter(Boolean))];
  const panelMap = resolveDiagramPanelMap(settings?.carDiagramMaps, "exploded", lookups);
  const companyLines = [
    [settings?.street, `${settings?.postalCode ?? ""} ${settings?.city ?? ""}`.trim(), settings?.country]
      .filter(Boolean)
      .join(" · "),
    [settings?.phone, settings?.email].filter(Boolean).join(" · "),
    settings?.taxId ? `TVA : ${settings.taxId}` : "",
  ].filter(Boolean);

  return (
    <div className="text-[13px] text-[#0c1929]">
      <header className="mb-4 flex items-start justify-between gap-4 border-b-[3px] border-amber pb-4">
        <div className="flex min-w-0 items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings?.logoPath || "/branding/logo.png"}
            alt=""
            className="h-14 w-auto max-w-[48mm] object-contain object-left"
          />
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight">{settings?.name || "DMK Services"}</h1>
            {companyLines.map((line) => (
              <p key={line} className="text-[11px] text-slate-500">
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold leading-none">DEVIS</div>
          <div className="mt-2 inline-block rounded-md border border-navy bg-amber px-3 py-1 text-base font-bold tracking-[0.12em] text-navy">
            {estimate.vehicle.licensePlate}
          </div>
          <div className="mt-1 text-sm font-semibold text-amber-600">{estimate.number}</div>
          <div className="text-[11px] text-slate-500">Date : {formatDate(estimate.date)}</div>
          {estimate.damageDate ? (
            <div className="text-[11px] text-slate-500">Sinistre : {formatDate(estimate.damageDate)}</div>
          ) : null}
        </div>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-line bg-mist p-2.5">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">Client</div>
          <p className="font-medium">{clientLabel(estimate.client)}</p>
          {estimate.client.street ? <p>{estimate.client.street}</p> : null}
          <p>
            {estimate.client.postalCode} {estimate.client.city}
          </p>
          {estimate.client.email ? <p>{estimate.client.email}</p> : null}
          {estimate.client.phone || estimate.client.mobile ? (
            <p>{estimate.client.phone || estimate.client.mobile}</p>
          ) : null}
          {estimate.client.taxId ? <p>TVA : {estimate.client.taxId}</p> : null}
        </div>
        <div className="rounded-lg border border-line bg-mist p-2.5">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">Véhicule</div>
          <p className="font-medium">
            {estimate.vehicle.brand} {estimate.vehicle.model}
          </p>
          <p>Immat. : {estimate.vehicle.licensePlate}</p>
          <p>VIN : {estimate.vehicle.vin || "—"}</p>
          {estimate.vehicle.year ? <p>Année : {estimate.vehicle.year}</p> : null}
          {estimate.vehicle.color ? <p>Couleur : {estimate.vehicle.color}</p> : null}
          {estimate.vehicle.mileage != null ? (
            <p>Km : {estimate.vehicle.mileage.toLocaleString("fr-FR")}</p>
          ) : null}
        </div>
      </div>

      <p className="mb-2 text-[11px] text-slate-500">
        Estimateur : {fullName(estimate.estimator.firstName, estimate.estimator.lastName)}
      </p>

      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-amber text-navy">
            <th rowSpan={2} className="border border-navy/40 px-1.5 py-1.5 text-left font-bold">
              Pièce
            </th>
            <th colSpan={5} className="border border-navy/40 px-1.5 py-1.5 text-center font-bold">
              Méthode
            </th>
            <th rowSpan={2} className="border border-navy/40 px-1.5 py-1.5 text-left font-bold">
              Taille
            </th>
            <th rowSpan={2} className="border border-navy/40 px-1.5 py-1.5 text-left font-bold">
              Bosses
            </th>
            <th rowSpan={2} className="border border-navy/40 px-1.5 py-1.5 text-left font-bold">
              Heures
            </th>
            <th rowSpan={2} className="border border-navy/40 px-1.5 py-1.5 text-left font-bold">
              Ex UT
            </th>
            <th rowSpan={2} className="border border-navy/40 px-1.5 py-1.5 text-left font-bold">
              Total
            </th>
          </tr>
          <tr className="bg-amber text-navy">
            {METHOD_FLAG_COLUMNS.map((col) => (
              <th key={col} className="border border-navy/40 px-1 py-1 text-center font-bold">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortByPanelOrder(estimate.lineItems).map((line, i) => {
              const flags = estimateLineMethodFlags(line);
              const replacement = line.repairMethod === "PANEL_REPLACEMENT";
              return (
                <tr key={line.id} className={i % 2 ? "bg-mist" : "bg-white"}>
                  <td className="border border-navy/25 px-1.5 py-1">{line.panel}</td>
                  {METHOD_FLAG_COLUMNS.map((col) => (
                    <td key={col} className="border border-navy/25 px-1 py-1 text-center">
                      {methodFlagMark(flags[col])}
                    </td>
                  ))}
                  <td className="border border-navy/25 px-1.5 py-1">{replacement ? "—" : line.dentSize ? `${line.dentSize} mm` : "—"}</td>
                  <td className="border border-navy/25 px-1.5 py-1 text-right">{replacement ? "—" : line.dentCount || ""}</td>
                  <td className="border border-navy/25 px-1.5 py-1 text-right">{replacement ? "—" : Number(line.laborHours).toFixed(1)}</td>
                  <td className="border border-navy/25 px-1.5 py-1 text-right">{formatLineExtraWu(line)}</td>
                  <td className="border border-navy/25 px-1.5 py-1 text-right font-semibold">
                    {isMethodFixed(estimate.servicePricing, line.repairMethod)
                      ? "—"
                      : formatCurrency(line.lineTotal)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      <p className="mt-1 text-[9px] leading-snug text-slate-500">{formatMethodLegend()}</p>

      <div className="mt-3">
        <EstimateTotalsPanels totals={totals} taxRate={Number(estimate.taxRate) || 0} compact />
      </div>

      <section className="mt-4 break-inside-avoid">
        <h2 className="mb-1 text-center text-sm font-semibold">Éclaté des dommages</h2>
        <div className="mx-auto w-[70%]">
          <CarDiagramSvg
            selected={selectedPanels}
            dentCounts={dentCounts}
            panelMap={panelMap}
            interactive={false}
            cropContent
          />
        </div>
      </section>

      {estimate.clientNotes ? (
        <section className="mt-4">
          <h2 className="text-sm font-semibold">Notes & conditions</h2>
          <p className="mt-1 whitespace-pre-wrap text-[11px] text-slate-600">{estimate.clientNotes}</p>
        </section>
      ) : null}

      {settings?.termsAndConditions ? (
        <section className="mt-3">
          <h2 className="text-xs font-semibold">Conditions générales</h2>
          <p className="mt-1 whitespace-pre-wrap text-[10px] text-slate-500">{settings.termsAndConditions}</p>
        </section>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-8 text-[10px] text-slate-400">
        <div className="h-16 border border-slate-300 p-1.5">Signature client</div>
        <div className="h-16 border border-slate-300 p-1.5">Cachet / signature DMK</div>
      </div>

      {estimate.includePhotos && photos.length ? (
        <section className="mt-6 break-before-page">
          <h2 className="mb-2 text-sm font-semibold">Photos des dommages</h2>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <figure key={photo.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.path} alt="" className="h-[58mm] w-full rounded border border-line object-cover" />
                <figcaption className="mt-1 text-[10px] text-slate-500">
                  {photo.caption || photo.filename}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
