import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { VehicleForm } from "@/components/VehicleForm";

import { requireWriter } from "@/lib/auth";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  await requireWriter();
  const { id } = await params;
  const [vehicle, clients] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id }, include: { clients: true } }),
    prisma.client.findMany({ orderBy: { lastName: "asc" } }),
  ]);
  if (!vehicle) notFound();
  return (
    <div>
      <PageHeader title="Modifier le véhicule" />
      <VehicleForm
        id={id}
        clients={clients}
        initial={{
          ...vehicle,
          links: vehicle.clients.map((l) => ({ clientId: l.clientId, role: l.role })),
        }}
      />
    </div>
  );
}
