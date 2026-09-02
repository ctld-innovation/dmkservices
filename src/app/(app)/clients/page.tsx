import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pagination, clientLabel, formatDate } from "@/lib/utils";
import { CLIENT_TYPES, CLIENT_STATUSES, STATUS_COLORS, labelOf } from "@/lib/constants";
import { Card, PageHeader, Pagination, EmptyState } from "@/components/ui";
import { CsvImport, WriteOnly } from "@/components/Actions";
import { canWrite, getSession } from "@/lib/auth";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; page?: string }>;
}) {
  const session = await getSession();
  const writable = session ? canWrite(session.role) : false;
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const type = sp.type || undefined;
  const status = sp.status || undefined;
  const page = Number(sp.page ?? 1);
  const where = {
    ...(type ? { type: type as "WORKSHOP" | "INTERMEDIARY" | "INSURANCE" | "FINAL_CLIENT" } : {}),
    ...(status ? { status: status as "ACTIVE" | "INACTIVE" } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { companyName: { contains: q } },
            { email: { contains: q } },
            { city: { contains: q } },
          ],
        }
      : {}),
  };
  const total = await prisma.client.count({ where });
  const pager = pagination(total, page, 12);
  const items = await prisma.client.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: pager.skip,
    take: pager.pageSize,
    include: { _count: { select: { estimates: true, vehicleLinks: true } } },
  });
  const extra = `${q ? `&q=${encodeURIComponent(q)}` : ""}${type ? `&type=${type}` : ""}${status ? `&status=${status}` : ""}`;

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Ateliers, intermédiaires, assurances et particuliers"
        actions={
          <>
            <a href="/api/clients/export" className="btn btn-ghost">
              Exporter CSV
            </a>
            <WriteOnly canWrite={writable}>
              <CsvImport />
              <Link href="/clients/new" className="btn btn-primary">
                Nouveau client
              </Link>
            </WriteOnly>
          </>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Recherche…" className="input max-w-xs" />
        <select name="type" defaultValue={type ?? ""} className="select max-w-xs">
          <option value="">Tous les types</option>
          {CLIENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="select max-w-xs">
          <option value="">Tous les statuts</option>
          {CLIENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="btn btn-navy" type="submit">
          Filtrer
        </button>
      </form>
      <Card>
        {items.length === 0 ? (
          <EmptyState title="Aucun client" subtitle="Créez un premier client ou importez un CSV." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Ville</th>
                  <th>Véhicules</th>
                  <th>Devis</th>
                  <th>Statut</th>
                  <th>MAJ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clients/${c.id}`} className="font-semibold text-navy">
                        {clientLabel(c)}
                      </Link>
                    </td>
                    <td>{labelOf(CLIENT_TYPES, c.type)}</td>
                    <td>{c.email || c.mobile || c.phone || "—"}</td>
                    <td>{c.city || "—"}</td>
                    <td>{c._count.vehicleLinks}</td>
                    <td>{c._count.estimates}</td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[c.status]}`}>
                        {labelOf(CLIENT_STATUSES, c.status)}
                      </span>
                    </td>
                    <td>{formatDate(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pager} basePath="/clients" extraQuery={extra} />
      </Card>
    </div>
  );
}
