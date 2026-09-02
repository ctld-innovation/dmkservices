import { PageHeader } from "@/components/ui";
import { ClientForm } from "@/components/ClientForm";
import { requireWriter } from "@/lib/auth";

export default async function NewClientPage() {
  await requireWriter();
  return (
    <div>
      <PageHeader title="Nouveau client" subtitle="Fiche atelier, intermédiaire, assurance ou particulier" />
      <ClientForm />
    </div>
  );
}
