"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FUEL_TYPES, VEHICLE_LINK_ROLES } from "@/lib/constants";
import { isValidVin, toInputDate } from "@/lib/utils";
import { Button, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";

export type VehicleFormClient = { id: string; companyName?: string | null; firstName: string; lastName: string };

export function VehicleForm({
  clients,
  initial,
  id,
}: {
  clients: VehicleFormClient[];
  id?: string;
  initial?: {
    licensePlate?: string;
    vin?: string;
    brand?: string;
    model?: string;
    year?: number | null;
    firstRegistration?: string | Date | null;
    color?: string | null;
    mileage?: number | null;
    fuelType?: string | null;
    notes?: string | null;
    links?: Array<{ clientId: string; role: string }>;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [vin, setVin] = useState(initial?.vin ?? "");
  const [selected, setSelected] = useState<string[]>(initial?.links?.map((l) => l.clientId) ?? []);
  const [roles, setRoles] = useState<Record<string, string>>(
    Object.fromEntries((initial?.links ?? []).map((l) => [l.clientId, l.role])),
  );

  const vinOk = !vin || isValidVin(vin);
  const clientOptions = useMemo(() => clients, [clients]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValidVin(vin)) {
      setError("VIN invalide (17 caractères, sans I, O ni Q)");
      return;
    }
    if (!selected.length) {
      setError("Liez au moins un client");
      return;
    }
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      licensePlate: form.get("licensePlate"),
      vin,
      brand: form.get("brand"),
      model: form.get("model"),
      year: form.get("year") ? Number(form.get("year")) : null,
      firstRegistration: form.get("firstRegistration") || null,
      color: form.get("color"),
      mileage: form.get("mileage") ? Number(form.get("mileage")) : null,
      fuelType: form.get("fuelType") || null,
      notes: form.get("notes"),
      clientIds: selected,
      clientRoles: roles,
    };
    const res = await fetch(id ? `/api/vehicles/${id}` : "/api/vehicles", {
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
    router.push(`/vehicles/${data.id}`);
    router.refresh();
  }

  function toggleClient(clientId: string) {
    setSelected((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId],
    );
    setRoles((prev) => ({ ...prev, [clientId]: prev[clientId] || "OWNER" }));
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Immatriculation">
          <Input name="licensePlate" required defaultValue={initial?.licensePlate ?? ""} className="uppercase" />
        </Field>
        <Field label="VIN (17 caractères)" hint={!vinOk ? "Format VIN invalide" : undefined}>
          <Input
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            maxLength={17}
            required
            className={!vinOk ? "border-red-400" : ""}
          />
        </Field>
        <Field label="Marque">
          <Input name="brand" required defaultValue={initial?.brand ?? ""} />
        </Field>
        <Field label="Modèle">
          <Input name="model" required defaultValue={initial?.model ?? ""} />
        </Field>
        <Field label="Année">
          <Input name="year" type="number" defaultValue={initial?.year ?? ""} />
        </Field>
        <Field label="1re immatriculation">
          <Input
            name="firstRegistration"
            type="date"
            defaultValue={toInputDate(initial?.firstRegistration ?? null)}
          />
        </Field>
        <Field label="Couleur">
          <Input name="color" defaultValue={initial?.color ?? ""} />
        </Field>
        <Field label="Kilométrage à l'entrée">
          <Input name="mileage" type="number" defaultValue={initial?.mileage ?? ""} />
        </Field>
        <Field label="Énergie">
          <Select name="fuelType" defaultValue={initial?.fuelType ?? ""}>
            <option value="">—</option>
            {FUEL_TYPES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notes">
        <Textarea name="notes" defaultValue={initial?.notes ?? ""} />
      </Field>
      <div>
        <div className="label">Clients liés (propriétaire, assurance…)</div>
        <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-line p-3">
          {clientOptions.map((c) => {
            const checked = selected.includes(c.id);
            return (
              <div key={c.id} className="flex flex-wrap items-center gap-3">
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <input type="checkbox" checked={checked} onChange={() => toggleClient(c.id)} />
                  {c.companyName ? `${c.companyName} — ` : ""}
                  {c.firstName} {c.lastName}
                </label>
                {checked ? (
                  <Select
                    value={roles[c.id] || "OWNER"}
                    onChange={(e) => setRoles((r) => ({ ...r, [c.id]: e.target.value }))}
                    className="w-44"
                  >
                    {VEHICLE_LINK_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
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
