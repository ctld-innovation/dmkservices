import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, vehicleLabel, clientLabel } from "@/lib/utils";
import { ESTIMATE_STATUSES, FUEL_TYPES, STATUS_COLORS, VEHICLE_LINK_ROLES, labelOf } from "@/lib/constants";
import { Card, PageHeader } from "@/components/ui";
import { DeleteButton, WriteOnly } from "@/components/Actions";
import { DeletePhotoButton, PhotoUploader } from "@/components/PhotoUploader";
import { canWrite, getSession } from "@/lib/auth";

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const writable = session ? canWrite(session.role) : false;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      clients: { include: { client: true } },
      photos: { orderBy: { createdAt: "desc" } },
      estimates: { orderBy: { date: "desc" }, include: { client: true } },
    },
  });
  if (!vehicle) notFound();

  return (
    <div>
      <PageHeader
        title={vehicleLabel(vehicle)}
        subtitle={vehicle.vin}
        actions={
          <WriteOnly canWrite={writable}>
            <Link href={`/vehicles/${id}/edit`} className="btn btn-primary">
              Modifier
            </Link>
            <DeleteButton url={`/api/vehicles/${id}`} redirectTo="/vehicles" />
          </WriteOnly>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-2 p-5">
          <h2 className="font-semibold text-navy">Fiche véhicule</h2>
          <p>Année : {vehicle.year ?? "—"}</p>
          <p>1re immat. : {formatDate(vehicle.firstRegistration)}</p>
          <p>Couleur : {vehicle.color ?? "—"}</p>
          <p>Km entrée : {vehicle.mileage?.toLocaleString("fr-FR") ?? "—"}</p>
          <p>Énergie : {labelOf(FUEL_TYPES, vehicle.fuelType)}</p>
          {vehicle.notes ? <p className="text-sm text-slate-600">{vehicle.notes}</p> : null}
          <p className="text-xs text-slate-400">Mis à jour le {formatDateTime(vehicle.updatedAt)}</p>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="border-b border-line px-5 py-4 font-semibold text-navy">Clients liés</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Rôle</th>
              </tr>
            </thead>
            <tbody>
              {vehicle.clients.map((link) => (
                <tr key={link.id}>
                  <td>
                    <Link href={`/clients/${link.client.id}`} className="font-medium text-navy">
                      {clientLabel(link.client)}
                    </Link>
                  </td>
                  <td>{labelOf(VEHICLE_LINK_ROLES, link.role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-navy">Photos des dommages</h2>
          {writable ? <PhotoUploader vehicleId={id} /> : null}
        </div>
        {vehicle.photos.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune photo</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {vehicle.photos.map((photo) => (
              <div key={photo.id} className="relative overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.path} alt={photo.filename} className="h-40 w-full object-cover" />
                {writable ? <DeletePhotoButton id={photo.id} /> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="border-b border-line px-5 py-4 font-semibold text-navy">Historique des devis</h2>
        {vehicle.estimates.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Aucun devis</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Date</th>
                <th>Client</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {vehicle.estimates.map((est) => (
                <tr key={est.id}>
                  <td>
                    <Link href={`/estimates/${est.id}`} className="font-semibold text-navy">
                      {est.number}
                    </Link>
                  </td>
                  <td>{formatDate(est.date)}</td>
                  <td>{clientLabel(est.client)}</td>
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
