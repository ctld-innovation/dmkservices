import { prisma } from "@/lib/prisma";
import { canAdmin, getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await getSession();
  const admin = canAdmin(session!.role);
  const [settings, lookups, users, audits] = await Promise.all([
    prisma.companySettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", name: "DMK Services" },
    }),
    prisma.lookupValue.findMany({ orderBy: { sortOrder: "asc" } }),
    admin
      ? prisma.user.findMany({
          orderBy: { lastName: "asc" },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            active: true,
          },
        })
      : Promise.resolve([]),
    admin
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 40,
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Profil entreprise, taux, listes et utilisateurs" />
      <SettingsForm
        settings={settings}
        lookups={lookups}
        users={users}
        audits={audits}
        isAdmin={admin}
      />
    </div>
  );
}
