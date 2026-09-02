import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pagination, vehicleLabel, formatDate } from "@/lib/utils";
import { Card, PageHeader, Pagination, EmptyState } from "@/components/ui";
import { WriteOnly } from "@/components/Actions";
import { canWrite, getSession } from "@/lib/auth";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const writable = session ? canWrite(session.role) : false;
  const q = sp.q?.trim() ?? "";
  const page = Number(sp.page ?? 1);
  const where = q
    ? {
        OR: [
          { licensePlate: { contains: q } },
          { vin: { contains: q } },
          { brand: { contains: q } },
          { model: { contains: q } },
        ],
      }
    : {};
  const total = await prisma.vehicle.count({ where });
  const pager = pagination(total, page, 12);
  const items = await prisma.vehicle.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: pager.skip,
    take: pager.pageSize,
    include: {
      clients: { include: { client: true } },
      _count: { select: { estimates: true, photos: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Véhicules"
        subtitle="Recherche par immatriculation ou VIN"
        actions={
          <WriteOnly canWrite={writable}>
            <Link href="/vehicles/new" className="btn btn-primary">
              Nouveau véhicule
            </Link>
          </WriteOnly>
        }
      />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Immat. ou VIN…" className="input max-w-sm" />
        <button className="btn btn-navy">Rechercher</button>
      </form>
      <Card>
        {items.length === 0 ? (
          <EmptyState title="Aucun véhicule" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th>VIN</th>
                  <th>Clients</th>
                  <th>Photos</th>
                  <th>Devis</th>
                  <th>MAJ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link href={`/vehicles/${v.id}`} className="font-semibold text-navy">
                        {vehicleLabel(v)}
                      </Link>
                    </td>
                    <td className="font-mono text-xs">{v.vin}</td>
                    <td>
                      {v.clients
                        .map((l) => l.client.companyName || `${l.client.firstName} ${l.client.lastName}`)
                        .join(", ")}
                    </td>
                    <td>{v._count.photos}</td>
                    <td>{v._count.estimates}</td>
                    <td>{formatDate(v.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pager} basePath="/vehicles" extraQuery={q ? `&q=${encodeURIComponent(q)}` : ""} />
      </Card>
    </div>
  );
}
