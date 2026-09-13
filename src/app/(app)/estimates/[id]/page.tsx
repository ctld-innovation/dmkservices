import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeEstimateTotalsWithSettings, isMethodFixed, estimateLineMethodFlags, METHOD_FLAG_COLUMNS, methodFlagMark } from "@/lib/calculations";
import { clientLabel, formatCurrency, formatDate, formatDateTime, fullName, vehicleLabel } from "@/lib/utils";
import {
  ESTIMATE_STATUSES,
  STATUS_COLORS,
  labelOf,
  sortByPanelOrder,
} from "@/lib/constants";
import { Card, PageHeader } from "@/components/ui";
import { EstimateTotalsPanels } from "@/components/EstimateTotalsPanels";
import { DeleteButton, DuplicateEstimateButton, EmailEstimate, StatusActions, WriteOnly } from "@/components/Actions";
import { canWrite, getSession } from "@/lib/auth";

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const writable = session ? canWrite(session.role) : false;
  const [settings, estimate] = await Promise.all([
    prisma.companySettings.findUnique({
      where: { id: "default" },
      select: { name: true, hagelExpert: true, defaultLaborRate: true, smtpReplyTo: true },
    }),
    prisma.estimate.findUnique({
      where: { id },
      include: {
        client: true,
        vehicle: true,
        estimator: true,
        lineItems: { orderBy: { sortOrder: "asc" } },
        statusLogs: { orderBy: { createdAt: "desc" }, include: { user: true } },
      },
    }),
  ]);
  if (!estimate) notFound();
  const totals = computeEstimateTotalsWithSettings(estimate, settings);

  return (
    <div>
      <PageHeader
        title={estimate.number}
        subtitle={`${clientLabel(estimate.client)} · ${vehicleLabel(estimate.vehicle)}`}
        actions={
          <>
            <span className={`badge ${STATUS_COLORS[estimate.status]}`}>
              {labelOf(ESTIMATE_STATUSES, estimate.status)}
            </span>
            <a href={`/api/estimates/${id}/pdf`} className="btn btn-navy">
              Télécharger PDF
            </a>
            <Link href={`/estimates/${id}/print`} className="btn btn-ghost">
              Imprimer
            </Link>
            <WriteOnly canWrite={writable}>
              <Link href={`/estimates/${id}/edit`} className="btn btn-primary">
                Modifier
              </Link>
              <EmailEstimate
                id={id}
                defaultTo={estimate.client.email}
                defaultCc={settings?.smtpReplyTo}
                estimateNumber={estimate.number}
                companyName={settings?.name || "DMK Services"}
                vehicle={estimate.vehicle}
              />
              <DuplicateEstimateButton id={id} />
              <DeleteButton
                url={`/api/estimates/${id}`}
                redirectTo="/estimates"
                title="Supprimer ce devis ?"
                message="Cette action est définitive. Un devis facturé ne peut pas être supprimé."
              />
            </WriteOnly>
          </>
        }
      />

      {writable ? (
        <Card className="mb-4 p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">Changer le statut</h2>
          <StatusActions id={id} status={estimate.status} />
        </Card>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="space-y-1 p-5 text-sm">
          <h2 className="mb-2 font-semibold text-navy">Client</h2>
          <p>{clientLabel(estimate.client)}</p>
          <p>{estimate.client.email}</p>
          <p>{estimate.client.street}</p>
          <p>
            {estimate.client.postalCode} {estimate.client.city}
          </p>
        </Card>
        <Card className="space-y-1 p-5 text-sm">
          <h2 className="mb-2 font-semibold text-navy">Véhicule</h2>
          <p>{vehicleLabel(estimate.vehicle)}</p>
          <p className="font-mono text-xs">{estimate.vehicle.vin || "—"}</p>
          <p>Sinistre : {formatDate(estimate.damageDate)}</p>
          <p>Estimateur : {fullName(estimate.estimator.firstName, estimate.estimator.lastName)}</p>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th rowSpan={2}>Pièce</th>
              <th colSpan={5} className="text-center">
                Méthode
              </th>
              <th rowSpan={2}>Taille</th>
              <th rowSpan={2}>Bosses</th>
              <th rowSpan={2}>Heures</th>
              <th rowSpan={2}>Total</th>
            </tr>
            <tr>
              {METHOD_FLAG_COLUMNS.map((col) => (
                <th key={col} className="text-center">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortByPanelOrder(estimate.lineItems).map((line) => {
              const flags = estimateLineMethodFlags(line);
              const replacement = line.repairMethod === "PANEL_REPLACEMENT";
              return (
                <tr key={line.id}>
                  <td>{line.panel}</td>
                  {METHOD_FLAG_COLUMNS.map((col) => (
                    <td key={col} className="text-center">
                      {methodFlagMark(flags[col])}
                    </td>
                  ))}
                  <td>{replacement ? "—" : line.dentSize ? `${line.dentSize} mm` : "—"}</td>
                  <td>{replacement ? "—" : line.dentCount}</td>
                  <td>{replacement ? "—" : line.laborHours}</td>
                  <td className="font-medium">
                    {isMethodFixed(estimate.servicePricing, line.repairMethod)
                      ? "—"
                      : formatCurrency(line.lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t border-line p-5">
          <EstimateTotalsPanels totals={totals} taxRate={estimate.taxRate} />
        </div>
      </Card>

      {estimate.internalNotes ? (
        <Card className="mt-4 p-5">
          <h2 className="mb-1 font-semibold text-navy">Notes internes</h2>
          <p className="text-sm text-slate-600">{estimate.internalNotes}</p>
        </Card>
      ) : null}

      <Card className="mt-4">
        <h2 className="border-b border-line px-5 py-4 font-semibold text-navy">Historique des statuts</h2>
        <ul className="divide-y divide-line">
          {estimate.statusLogs.map((log) => (
            <li key={log.id} className="px-5 py-3 text-sm">
              <span className="font-medium">
                {log.fromStatus ? `${labelOf(ESTIMATE_STATUSES, log.fromStatus)} → ` : ""}
                {labelOf(ESTIMATE_STATUSES, log.toStatus)}
              </span>
              <span className="text-slate-500">
                {" "}
                · {fullName(log.user.firstName, log.user.lastName)} · {formatDateTime(log.createdAt)}
              </span>
              {log.note ? <div className="text-slate-600">{log.note}</div> : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
