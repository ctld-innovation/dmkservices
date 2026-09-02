import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { VehicleForm } from "@/components/VehicleForm";
import { requireWriter } from "@/lib/auth";

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; from?: string }>;
}) {
  await requireWriter();
  const sp = await searchParams;
  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    orderBy: { lastName: "asc" },
  });
  return (
    <div>
      <PageHeader title="Nouveau véhicule" subtitle="Un véhicule peut être lié à plusieurs clients" />
      <VehicleForm clients={clients} lockToClientId={sp.clientId} redirectTo={sp.from} />
    </div>
  );
}
