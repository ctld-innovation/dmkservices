import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/calculations";
import { pagination, clientLabel, formatCurrency, formatDate, vehicleLabel } from "@/lib/utils";
import { ESTIMATE_STATUSES, STATUS_COLORS, labelOf } from "@/lib/constants";
import { Card, PageHeader, Pagination, EmptyState } from "@/components/ui";
import { WriteOnly } from "@/components/Actions";
import { canWrite, getSession } from "@/lib/auth";

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const writable = session ? canWrite(session.role) : false;
  const q = sp.q?.trim() ?? "";
  const status = sp.status || undefined;
  const page = Number(sp.page ?? 1);
  const where = {
    ...(status ? { status: status as "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "INVOICED" } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q } },
            { client: { lastName: { contains: q } } },
            { client: { companyName: { contains: q } } },
            { vehicle: { licensePlate: { contains: q } } },
          ],
        }
      : {}),
  };
  const total = await prisma.estimate.count({ where });
  const pager = pagination(total, page, 12);
  const items = await prisma.estimate.findMany({
    where,
    orderBy: { date: "desc" },
    skip: pager.skip,
    take: pager.pageSize,
    include: { client: true, vehicle: true, lineItems: true },
  });
  const extra = `${q ? `&q=${encodeURIComponent(q)}` : ""}${status ? `&status=${status}` : ""}`;

  return (
    <div>
      <PageHeader
        title="Devis"
        subtitle="Estimations PDR, grêle et carrosserie"
        actions={
          <WriteOnly canWrite={writable}>
            <Link href="/estimates/new" className="btn btn-primary">
              Nouveau devis
            </Link>
          </WriteOnly>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="N°, client, immat…" className="input max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="select max-w-xs">
          <option value="">Tous les statuts</option>
          {ESTIMATE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="btn btn-navy">Filtrer</button>
      </form>
      <Card>
        {items.length === 0 ? (
          <EmptyState title="Aucun devis" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Véhicule</th>
                  <th>Statut</th>
                  <th>Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {items.map((est) => {
                  const totals = computeTotals(
                    est.lineItems,
                    est.discountType,
                    est.discountValue,
                    est.taxRate,
                  );
                  return (
                    <tr key={est.id}>
                      <td>
                        <Link href={`/estimates/${est.id}`} className="font-semibold text-navy">
                          {est.number}
                        </Link>
                      </td>
                      <td>{formatDate(est.date)}</td>
                      <td>{clientLabel(est.client)}</td>
                      <td>{vehicleLabel(est.vehicle)}</td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[est.status]}`}>
                          {labelOf(ESTIMATE_STATUSES, est.status)}
                        </span>
                      </td>
                      <td className="font-medium">{formatCurrency(totals.grandTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pager} basePath="/estimates" extraQuery={extra} />
      </Card>
    </div>
  );
}
