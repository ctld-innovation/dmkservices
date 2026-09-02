import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ClientForm } from "@/components/ClientForm";
import { requireWriter } from "@/lib/auth";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireWriter();
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();
  return (
    <div>
      <PageHeader title="Modifier le client" />
      <ClientForm id={id} initial={client} />
    </div>
  );
}
