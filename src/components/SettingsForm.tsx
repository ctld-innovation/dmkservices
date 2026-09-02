"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanySettings, LookupValue, Role } from "@prisma/client";
import { ROLES } from "@/lib/constants";
import { Button, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  active: boolean;
};

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
}: {
  settings: CompanySettings;
  lookups: LookupValue[];
  users: UserRow[];
  audits: AuditRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"company" | "lookups" | "users" | "backup" | "audit">("company");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [panelLabel, setPanelLabel] = useState("");

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
      defaultTaxRate: Number(form.get("defaultTaxRate")),
      estimatePrefix: form.get("estimatePrefix"),
      estimateSeqPad: Number(form.get("estimateSeqPad")),
      termsAndConditions: form.get("termsAndConditions"),
      smtpHost: form.get("smtpHost"),
      smtpPort: form.get("smtpPort") ? Number(form.get("smtpPort")) : null,
      smtpUser: form.get("smtpUser"),
      smtpPass: form.get("smtpPass"),
      smtpFrom: form.get("smtpFrom"),
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

  async function addPanel() {
    if (!panelLabel.trim()) return;
    await fetch("/api/lookups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "PANEL", label: panelLabel }),
    });
    setPanelLabel("");
    router.refresh();
  }

  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        role: form.get("role"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  async function removeLookup(id: string) {
    await fetch("/api/lookups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  async function toggleUser(id: string, active: boolean) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
  }

  const tabs = [
    { id: "company" as const, label: "Entreprise" },
    { id: "lookups" as const, label: "Listes" },
    { id: "users" as const, label: "Utilisateurs" },
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
            <Field label="Taux horaire par défaut (€)">
              <Input name="defaultLaborRate" type="number" step="0.5" defaultValue={settings.defaultLaborRate} />
            </Field>
            <Field label="TVA par défaut (%)">
              <Input name="defaultTaxRate" type="number" step="0.1" defaultValue={settings.defaultTaxRate} />
            </Field>
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
            <Field label="Expéditeur">
              <Input name="smtpFrom" defaultValue={settings.smtpFrom ?? ""} />
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
          <ul className="columns-2 gap-4 text-sm sm:columns-3">
            {lookups
              .filter((l) => l.category === "PANEL")
              .map((l) => (
                <li key={l.id} className="mb-1 flex items-center justify-between gap-2 break-inside-avoid">
                  <span>{l.label}</span>
                  {isAdmin ? (
                    <button type="button" className="text-xs text-red-600" onClick={() => removeLookup(l.id)}>
                      Retirer
                    </button>
                  ) : null}
                </li>
              ))}
          </ul>
          <p className="mt-4 text-sm text-slate-500">
            Méthodes de réparation prédéfinies : PDR, réparation conventionnelle, remplacement de pièce.
          </p>
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="space-y-4">
          {!isAdmin ? (
            <p className="text-sm text-slate-500">La gestion des utilisateurs est réservée aux administrateurs.</p>
          ) : (
            <>
              <form onSubmit={createUser} className="card grid gap-3 p-6 sm:grid-cols-2">
                <Field label="Prénom">
                  <Input name="firstName" required />
                </Field>
                <Field label="Nom">
                  <Input name="lastName" required />
                </Field>
                <Field label="Email">
                  <Input name="email" type="email" required />
                </Field>
                <Field label="Mot de passe">
                  <Input name="password" type="password" required minLength={8} />
                </Field>
                <Field label="Rôle">
                  <Select name="role" defaultValue="ESTIMATOR">
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button type="submit">Créer l&apos;utilisateur</Button>
                </div>
              </form>
              <div className="card overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Rôle</th>
                      <th>Actif</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          {u.firstName} {u.lastName}
                        </td>
                        <td>{u.email}</td>
                        <td>{ROLES.find((r) => r.value === u.role)?.label}</td>
                        <td>{u.active ? "Oui" : "Non"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => toggleUser(u.id, u.active)}
                          >
                            {u.active ? "Désactiver" : "Activer"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
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

      {tab === "backup" ? (
        <div className="card space-y-3 p-6">
          <p className="text-sm text-slate-600">
            Téléchargez une sauvegarde JSON de l&apos;ensemble des données. La base MySQL se configure via{" "}
            <code>DATABASE_URL</code>.
          </p>
          {isAdmin ? (
            <a href="/api/backup" className="btn btn-primary inline-flex">
              Télécharger la sauvegarde JSON
            </a>
          ) : (
            <p className="text-sm">Réservé à l&apos;administrateur.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
