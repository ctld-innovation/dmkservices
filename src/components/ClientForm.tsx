"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CLIENT_TYPES, CLIENT_STATUSES } from "@/lib/constants";
import { Button, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";

export type ClientFormValues = {
  type: string;
  companyName?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  street?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  taxId?: string | null;
  notes?: string | null;
  status?: string;
};

export function ClientForm({
  initial,
  id,
}: {
  initial?: Partial<ClientFormValues>;
  id?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(initial?.type ?? "FINAL_CLIENT");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch(id ? `/api/clients/${id}` : "/api/clients", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Enregistrement impossible");
      return;
    }
    router.push(`/clients/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type de client">
          <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
            {CLIENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Statut">
          <Select name="status" defaultValue={initial?.status ?? "ACTIVE"}>
            {CLIENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        {type !== "FINAL_CLIENT" ? (
          <Field label="Raison sociale">
            <Input name="companyName" defaultValue={initial?.companyName ?? ""} />
          </Field>
        ) : (
          <input type="hidden" name="companyName" defaultValue={initial?.companyName ?? ""} />
        )}
        <Field label="N° TVA / SIRET">
          <Input name="taxId" defaultValue={initial?.taxId ?? ""} />
        </Field>
        <Field label="Prénom du contact">
          <Input name="firstName" required defaultValue={initial?.firstName ?? ""} />
        </Field>
        <Field label="Nom du contact">
          <Input name="lastName" required defaultValue={initial?.lastName ?? ""} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={initial?.email ?? ""} />
        </Field>
        <Field label="Téléphone">
          <Input name="phone" defaultValue={initial?.phone ?? ""} />
        </Field>
        <Field label="Mobile">
          <Input name="mobile" defaultValue={initial?.mobile ?? ""} />
        </Field>
        <Field label="Pays">
          <Input name="country" defaultValue={initial?.country ?? "France"} />
        </Field>
        <Field label="Adresse">
          <Input name="street" defaultValue={initial?.street ?? ""} />
        </Field>
        <Field label="Code postal">
          <Input name="postalCode" defaultValue={initial?.postalCode ?? ""} />
        </Field>
        <Field label="Ville">
          <Input name="city" defaultValue={initial?.city ?? ""} />
        </Field>
      </div>
      <Field label="Notes internes">
        <Textarea name="notes" defaultValue={initial?.notes ?? ""} />
      </Field>
      <ErrorText message={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
