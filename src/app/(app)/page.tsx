import Link from "next/link";
import { Car, ClipboardList, Plus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/calculations";
import { clientLabel, formatCurrency, formatDate, vehicleLabel } from "@/lib/utils";
import { ESTIMATE_STATUSES, STATUS_COLORS, labelOf } from "@/lib/constants";
import { getSession, canWrite } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { ClientTypeChart, StatusChart } from "@/components/Charts";
import { WriteOnly } from "@/components/Actions";

export default async function DashboardPage() {
  const session = await getSession();
  const writable = session ? canWrite(session.role) : false;
  const [clients, estimates, recent, counts] = await Promise.all([
    prisma.client.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.estimate.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.estimate.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { client: true, vehicle: true, lineItems: true },
    }),
    {
      clients: prisma.client.count(),
      vehicles: prisma.vehicle.count(),
      estimates: prisma.estimate.count(),
    },
  ]);
  const [clientCount, vehicleCount, estimateCount] = await Promise.all([
    counts.clients,
    counts.vehicles,
    counts.estimates,
  ]);

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de l'activité débosselage & grêle"
        actions={
          <WriteOnly canWrite={writable}>
            <Link href="/clients/new" className="btn btn-ghost">
              <Plus size={16} /> Client
            </Link>
            <Link href="/vehicles/new" className="btn btn-ghost">
              <Plus size={16} /> Véhicule
            </Link>
            <Link href="/estimates/new" className="btn btn-primary">
              <Plus size={16} /> Nouveau devis
            </Link>
          </WriteOnly>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={<Users size={18} />} label="Clients" value={clientCount} href="/clients" />
        <Stat icon={<Car size={18} />} label="Véhicules" value={vehicleCount} href="/vehicles" />
        <Stat icon={<ClipboardList size={18} />} label="Devis" value={estimateCount} href="/estimates" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-2 font-semibold text-navy">Clients par type</h2>
          <ClientTypeChart data={clients} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-semibold text-navy">Devis par statut</h2>
          <StatusChart data={estimates} />
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold text-navy">Devis récents</h2>
          <Link href="/estimates" className="text-sm font-medium text-amber-600">
            Voir tout
          </Link>
        </div>
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
              {recent.map((est) => {
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
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="card flex items-center gap-4 p-5 transition hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber text-navy">{icon}</div>
      <div>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="text-2xl font-semibold text-navy">{value}</div>
      </div>
    </Link>
  );
}
