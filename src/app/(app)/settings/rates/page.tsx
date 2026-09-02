import { prisma } from "@/lib/prisma";
import { canWrite, getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { LaborRatesForm } from "@/components/LaborRatesForm";
import { ensureLaborRates } from "@/lib/laborRates";
import Link from "next/link";

export default async function LaborRatesPage() {
  const session = await getSession();
  await ensureLaborRates();
  const settings = await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "DMK Services" },
  });
  const rates = await prisma.laborRate.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });

  return (
    <div>
      <PageHeader
        title="Taux horaires"
        subtitle="Taux horaires et TVA appliqués aux devis"
        actions={
          <Link href="/settings" className="btn btn-ghost">
            Retour aux paramètres
          </Link>
        }
      />
      <LaborRatesForm
        initialRates={rates}
        defaultTaxRate={settings.defaultTaxRate}
        canEdit={session ? canWrite(session.role) : false}
      />
    </div>
  );
}
