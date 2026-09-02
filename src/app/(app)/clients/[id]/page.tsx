import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clientLabel, formatDate, formatDateTime, fullName, vehicleLabel } from "@/lib/utils";
import { CLIENT_TYPES, CLIENT_STATUSES, ESTIMATE_STATUSES, STATUS_COLORS, VEHICLE_LINK_ROLES, labelOf } from "@/lib/constants";
import { Card, PageHeader } from "@/components/ui";
import { DeleteButton, WriteOnly } from "@/components/Actions";
import { canWrite, getSession } from "@/lib/auth";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const writable = session ? canWrite(session.role) : false;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      vehicleLinks: { include: { vehicle: true } },
      estimates: { orderBy: { date: "desc" }, include: { vehicle: true } },
      createdBy: true,
      updatedBy: true,
    },
  });
  if (!client) notFound();

  return (
    <div>
      <PageHeader
        title={clientLabel(client)}
        subtitle={labelOf(CLIENT_TYPES, client.type)}
        actions={
          <WriteOnly canWrite={writable}>
            <Link href={`/clients/${id}/edit`} className="btn btn-primary">
              Modifier
            </Link>
            <DeleteButton url={`/api/clients/${id}`} redirectTo="/clients" />
          </WriteOnly>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-2 p-5 lg:col-span-1">
          <h2 className="font-semibold text-navy">Coordonnées</h2>
          <p>{fullName(client.firstName, client.lastName)}</p>
          <p>{client.email || "—"}</p>
          <p>{[client.phone, client.mobile].filter(Boolean).join(" · ") || "—"}</p>
          <p>
            {client.street}
            <br />
            {client.postalCode} {client.city}
            <br />
            {client.country}
          </p>
          {client.taxId ? <p>TVA : {client.taxId}</p> : null}
          <p>
            <span className={`badge ${STATUS_COLORS[client.status]}`}>
              {labelOf(CLIENT_STATUSES, client.status)}
            </span>
          </p>
          {client.notes ? <p className="text-sm text-slate-600">{client.notes}</p> : null}
          <p className="text-xs text-slate-400">
            Créé le {formatDateTime(client.createdAt)}
            {client.createdBy ? ` par ${fullName(client.createdBy.firstName, client.createdBy.lastName)}` : ""}
            <br />
            Modifié le {formatDateTime(client.updatedAt)}
          </p>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="border-b border-line px-5 py-4 font-semibold text-navy">Véhicules liés</h2>
          {client.vehicleLinks.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Aucun véhicule</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th>VIN</th>
                  <th>Rôle</th>
                </tr>
              </thead>
              <tbody>
                {client.vehicleLinks.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <Link href={`/vehicles/${link.vehicle.id}`} className="font-medium text-navy">
                        {vehicleLabel(link.vehicle)}
                      </Link>
                    </td>
                    <td className="font-mono text-xs">{link.vehicle.vin}</td>
                    <td>{labelOf(VEHICLE_LINK_ROLES, link.role)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      <Card className="mt-4">
        <h2 className="border-b border-line px-5 py-4 font-semibold text-navy">Devis</h2>
        {client.estimates.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Aucun devis</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Date</th>
                <th>Véhicule</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {client.estimates.map((est) => (
                <tr key={est.id}>
                  <td>
                    <Link href={`/estimates/${est.id}`} className="font-semibold text-navy">
                      {est.number}
                    </Link>
                  </td>
                  <td>{formatDate(est.date)}</td>
                  <td>{vehicleLabel(est.vehicle)}</td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[est.status]}`}>
                      {labelOf(ESTIMATE_STATUSES, est.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
