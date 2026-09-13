"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanySettings, LookupValue } from "@prisma/client";
import { resolveCarDiagram, panelSortIndex, type CarDiagram } from "@/lib/constants";
import { Button, ErrorText, Field, Input, Textarea } from "@/components/ui";
import { DiagramMappingEditor } from "@/components/DiagramMappingEditor";
import { ExplodedColorsSettings } from "@/components/ExplodedColorsSettings";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UsersSettings, type UserRow } from "@/components/UsersSettings";
import { BackupSettings } from "@/components/BackupSettings";
import type { DiagramMaps } from "@/lib/diagram";
import type { SessionUser } from "@/lib/auth";
import Link from "next/link";

type TabId = "company" | "lookups" | "users" | "backup" | "audit";

type AuditRow = {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  details: string | null;
  createdAt: Date | string;
  user: { firstName: string; lastName: string; email: string } | null;
};

export function SettingsForm({
  settings,
  lookups,
  users,
  audits,
  isAdmin,
  currentUser,
  defaultTab = "company",
}: {
  settings: CompanySettings;
  lookups: LookupValue[];
  users: UserRow[];
  audits: AuditRow[];
  isAdmin: boolean;
  currentUser: SessionUser;
  defaultTab?: TabId;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>(defaultTab);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [panelLabel, setPanelLabel] = useState("");
  const [pendingLookup, setPendingLookup] = useState<LookupValue | null>(null);
  const [editingLookup, setEditingLookup] = useState<LookupValue | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingLookup, setSavingLookup] = useState(false);
  const [deletingLookup, setDeletingLookup] = useState(false);

  async function saveCompany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      street: form.get("street"),
      city: form.get("city"),
      postalCode: form.get("postalCode"),
      country: form.get("country"),
      phone: form.get("phone"),
      email: form.get("email"),
      taxId: form.get("taxId"),
      defaultLaborRate: Number(form.get("defaultLaborRate")),
      defaultTaxRate: settings.defaultTaxRate,
      estimatePrefix: form.get("estimatePrefix"),
      estimateSeqPad: Number(form.get("estimateSeqPad")),
      termsAndConditions: form.get("termsAndConditions"),
      smtpHost: form.get("smtpHost"),
      smtpPort: form.get("smtpPort") ? Number(form.get("smtpPort")) : null,
      smtpUser: form.get("smtpUser"),
      smtpPass: form.get("smtpPass"),
      smtpFrom: form.get("smtpFrom"),
      smtpReplyTo: String(form.get("smtpReplyTo") || "").trim() || null,
    };
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      setOk("Paramètres enregistrés");
      router.refresh();
    }
  }

  async function uploadLogo(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    await fetch("/api/settings/logo", { method: "POST", body: fd });
    router.refresh();
  }

  async function saveDiagram(carDiagram: CarDiagram, carDiagramMaps: DiagramMaps) {
    const payload = {
      name: settings.name,
      street: settings.street,
      city: settings.city,
      postalCode: settings.postalCode,
      country: settings.country,
      phone: settings.phone,
      email: settings.email,
      taxId: settings.taxId,
      defaultLaborRate: settings.defaultLaborRate,
      defaultTaxRate: settings.defaultTaxRate,
      estimatePrefix: settings.estimatePrefix,
      estimateSeqPad: settings.estimateSeqPad,
      carDiagram,
      carDiagramMaps,
      termsAndConditions: settings.termsAndConditions,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPass: settings.smtpPass ? "********" : "",
      smtpFrom: settings.smtpFrom,
      smtpReplyTo: settings.smtpReplyTo,
    };
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Enregistrement impossible");
    router.refresh();
  }

  async function addPanel() {
    if (!panelLabel.trim()) return;
    setError(null);
    const res = await fetch("/api/lookups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "PANEL", label: panelLabel }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Impossible d'ajouter cette pièce");
      return;
    }
    setPanelLabel("");
    setTab("lookups");
    router.refresh();
  }

  function openEditLookup(item: LookupValue) {
    setEditingLookup(item);
    setEditLabel(item.label);
    setEditError(null);
  }

  async function saveLookupName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingLookup) return;
    const label = editLabel.trim();
    if (!label) {
      setEditError("Libellé requis");
      return;
    }
    setSavingLookup(true);
    setEditError(null);
    setError(null);
    const res = await fetch("/api/lookups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingLookup.id, label }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingLookup(false);
    if (!res.ok) {
      setEditError(data.error || "Impossible de modifier cette pièce");
      return;
    }
    setEditingLookup(null);
    setTab("lookups");
    router.refresh();
  }

  async function removeLookup() {
    if (!pendingLookup) return;
    setDeletingLookup(true);
    setError(null);
    const res = await fetch("/api/lookups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pendingLookup.id }),
    });
    const data = await res.json().catch(() => ({}));
    setDeletingLookup(false);
    if (!res.ok) {
      setError(data.error || "Impossible de retirer cette pièce");
      setPendingLookup(null);
      return;
    }
    setPendingLookup(null);
    setTab("lookups");
    router.refresh();
  }

  const tabs = [
    { id: "company" as const, label: "Entreprise" },
    { id: "lookups" as const, label: "Listes" },
    { id: "users" as const, label: isAdmin ? "Utilisateurs" : "Mon profil" },
    { id: "audit" as const, label: "Journal" },
    { id: "backup" as const, label: "Sauvegarde" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`btn ${tab === t.id ? "btn-navy" : "btn-ghost"}`}
            onClick={() => setTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.push("/settings/rates")}
        >
          Taux horaires
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.push("/settings/hagel")}
        >
          Hagel Expert
        </button>
      </div>

      {tab === "company" ? (
        <form onSubmit={saveCompany} className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de l'entreprise">
              <Input name="name" defaultValue={settings.name} required />
            </Field>
            <Field label="Email">
              <Input name="email" defaultValue={settings.email ?? ""} />
            </Field>
            <Field label="Téléphone">
              <Input name="phone" defaultValue={settings.phone ?? ""} />
            </Field>
            <Field label="N° TVA">
              <Input name="taxId" defaultValue={settings.taxId ?? ""} />
            </Field>
            <Field label="Adresse">
              <Input name="street" defaultValue={settings.street ?? ""} />
            </Field>
            <Field label="Code postal">
              <Input name="postalCode" defaultValue={settings.postalCode ?? ""} />
            </Field>
            <Field label="Ville">
              <Input name="city" defaultValue={settings.city ?? ""} />
            </Field>
            <Field label="Pays">
              <Input name="country" defaultValue={settings.country ?? "France"} />
            </Field>
            <div className="sm:col-span-2">
              <p className="label">Taux horaires par défaut</p>
              <input type="hidden" name="defaultLaborRate" value={settings.defaultLaborRate} />
              <Link href="/settings/rates" className="btn btn-ghost mt-1">
                Configurer les taux horaires et la TVA ({settings.defaultLaborRate} €/h · {settings.defaultTaxRate} %)
              </Link>
              <Link href="/settings/hagel" className="btn btn-ghost mt-1">
                Configurer le barème Hagel Expert
              </Link>
            </div>
            <Field label="Préfixe des devis">
              <Input name="estimatePrefix" defaultValue={settings.estimatePrefix} />
            </Field>
            <Field label="Nb de chiffres (ex. 4 → 0001)">
              <Input name="estimateSeqPad" type="number" defaultValue={settings.estimateSeqPad} />
            </Field>
          </div>
          <Field label="Logo">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.logoPath || "/branding/logo.png"}
                alt="Logo"
                className="h-16 w-auto rounded-lg border border-line bg-white p-2"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              />
            </div>
          </Field>
          <Field label="Conditions générales (pied de PDF)">
            <Textarea name="termsAndConditions" defaultValue={settings.termsAndConditions ?? ""} />
          </Field>
          <h3 className="pt-2 font-semibold text-navy">SMTP (envoi des devis)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hôte">
              <Input name="smtpHost" defaultValue={settings.smtpHost ?? ""} />
            </Field>
            <Field label="Port">
              <Input name="smtpPort" type="number" defaultValue={settings.smtpPort ?? 587} />
            </Field>
            <Field label="Utilisateur">
              <Input name="smtpUser" defaultValue={settings.smtpUser ?? ""} />
            </Field>
            <Field label="Mot de passe">
              <Input name="smtpPass" type="password" defaultValue={settings.smtpPass ? "********" : ""} />
            </Field>
            <Field
              label="Expéditeur"
              hint="Nom affiché, ou Nom <compte SMTP>. Une autre adresse n'est acceptée que si c'est un alias du même domaine."
            >
              <Input
                name="smtpFrom"
                defaultValue={settings.smtpFrom ?? ""}
                placeholder='DMK Services <noreply@dmkservices.fr>'
              />
            </Field>
            <Field
              label="Répondre à"
              hint="Adresse de contact (ex. une autre boîte). C'est elle qui reçoit les réponses, pas l'expéditeur technique."
            >
              <Input name="smtpReplyTo" type="email" defaultValue={settings.smtpReplyTo ?? ""} />
            </Field>
          </div>
          <ErrorText message={error} />
          {ok ? <p className="text-sm text-green-700">{ok}</p> : null}
          <Button type="submit" disabled={!isAdmin}>
            {isAdmin ? "Enregistrer" : "Réservé à l'administrateur"}
          </Button>
        </form>
      ) : null}

      {tab === "lookups" ? (
        <div className="card p-6">
          <h3 className="mb-3 font-semibold text-navy">Pièces / panneaux</h3>
          <div className="mb-4 flex gap-2">
            <Input value={panelLabel} onChange={(e) => setPanelLabel(e.target.value)} placeholder="Nouvelle pièce…" />
            <Button type="button" onClick={addPanel} disabled={!isAdmin}>
              Ajouter
            </Button>
          </div>
          <ErrorText message={error} />
          <ul className="columns-2 gap-4 text-sm sm:columns-3">
            {lookups
              .filter((l) => l.category === "PANEL" && l.active)
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder || panelSortIndex(a.label) - panelSortIndex(b.label) || a.label.localeCompare(b.label, "fr"))
              .map((l) => (
                <li key={l.id} className="mb-1 flex items-center justify-between gap-2 break-inside-avoid">
                  <span>{l.label}</span>
                  {isAdmin ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <button type="button" className="text-xs text-navy" onClick={() => openEditLookup(l)}>
                        Modifier
                      </button>
                      <button type="button" className="text-xs text-red-600" onClick={() => setPendingLookup(l)}>
                        Retirer
                      </button>
                    </span>
                  ) : null}
                </li>
              ))}
          </ul>
          <p className="mt-4 text-sm text-slate-500">
            Méthodes de réparation prédéfinies : DSP, remplacement de pièce. Les listes de marques et modèles
            automobiles sont proposées à la création d’un véhicule et s’enrichissent si vous saisissez un nom
            inexistant.
          </p>
          <DiagramMappingEditor
            initialDiagram={resolveCarDiagram(settings.carDiagram)}
            initialMaps={settings.carDiagramMaps}
            pieces={lookups
              .filter((l) => l.category === "PANEL" && l.active)
              .slice()
              .sort((a, b) => panelSortIndex(a.label) - panelSortIndex(b.label) || a.label.localeCompare(b.label, "fr"))}
            isAdmin={isAdmin}
            onSave={saveDiagram}
          />
          <ExplodedColorsSettings initial={settings.explodedColors} isAdmin={isAdmin} />
        </div>
      ) : null}

      {tab === "users" ? (
        <UsersSettings users={users} isAdmin={isAdmin} currentUser={currentUser} />
      ) : null}

      {tab === "audit" ? (
        <div className="card overflow-x-auto">
          {!isAdmin ? (
            <p className="p-6 text-sm text-slate-500">Le journal d&apos;audit est réservé aux administrateurs.</p>
          ) : audits.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Aucune entrée.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Entité</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.createdAt).toLocaleString("fr-FR")}</td>
                    <td>{a.user ? `${a.user.firstName} ${a.user.lastName}` : "—"}</td>
                    <td>{a.action}</td>
                    <td>
                      {a.entity} · <span className="font-mono text-xs">{a.entityId.slice(0, 8)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {tab === "backup" ? <BackupSettings isAdmin={isAdmin} /> : null}
      {editingLookup ? (
        <div className="modal-overlay" role="presentation" onClick={() => !savingLookup && setEditingLookup(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-panel-title"
            className="modal-card modal-card-sm"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveLookupName}
          >
            <div className="px-5 py-4">
              <h2 id="edit-panel-title" className="text-lg font-semibold text-navy">
                Modifier le nom
              </h2>
              <div className="mt-3">
                <Field label="Nom du panneau">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    autoFocus
                    required
                  />
                </Field>
              </div>
              <ErrorText message={editError} />
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <Button type="button" variant="ghost" onClick={() => setEditingLookup(null)} disabled={savingLookup}>
                Annuler
              </Button>
              <Button type="submit" disabled={savingLookup}>
                {savingLookup ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(pendingLookup)}
        title={pendingLookup ? `Retirer « ${pendingLookup.label} » ?` : "Retirer cette pièce ?"}
        message={
          pendingLookup
            ? `« ${pendingLookup.label} » disparaîtra des listes utilisées pour les devis.`
            : ""
        }
        busy={deletingLookup}
        confirmLabel="Retirer"
        onCancel={() => !deletingLookup && setPendingLookup(null)}
        onConfirm={() => void removeLookup()}
      />
    </div>
  );
}
