import { prisma } from "@/lib/prisma";
import { canWrite, getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { HagelExpertForm } from "@/components/HagelExpertForm";
import Link from "next/link";

export default async function HagelExpertSettingsPage() {
  const session = await getSession();
  const settings = await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "DMK Services" },
  });

  return (
    <div>
      <PageHeader
        title="Hagel Expert"
        subtitle="Barème AW, teiler et majorations utilisés pour calculer chaque ligne de devis"
        actions={
          <Link href="/settings" className="btn btn-ghost">
            Retour aux paramètres
          </Link>
        }
      />
      <HagelExpertForm initial={settings.hagelExpert} canEdit={session ? canWrite(session.role) : false} />
    </div>
  );
}
