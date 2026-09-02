"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export type LaborRateRow = {
  id: string;
  label: string;
  amount: number;
  isDefault: boolean;
  active: boolean;
  sortOrder: number;
};

export function LaborRatesForm({
  initialRates,
  defaultTaxRate,
  canEdit,
}: {
  initialRates: LaborRateRow[];
  defaultTaxRate: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState(defaultTaxRate);
  const [busy, setBusy] = useState(false);

  async function saveTaxRate(value: number) {
    if (!canEdit) return;
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultTaxRate: value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "TVA non enregistrée");
    else {
      setOk("TVA enregistrée");
      router.refresh();
    }
  }

  async function createRate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch("/api/labor-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: fd.get("label"),
        amount: Number(fd.get("amount")),
        isDefault: fd.get("isDefault") === "on",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Création impossible");
      return;
    }
    form.reset();
    setOk("Taux ajouté");
    router.refresh();
  }

  async function patchRate(id: string, payload: Record<string, unknown>) {
    if (!canEdit) return;
    setError(null);
    const res = await fetch("/api/labor-rates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "Mise à jour impossible");
    else {
      setOk("Taux enregistré");
      router.refresh();
    }
  }

  async function removeRate(id: string) {
    if (!canEdit) return;
    if (!confirm("Supprimer ce taux horaire ?")) return;
    const res = await fetch("/api/labor-rates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "Suppression impossible");
    else router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="card max-w-md p-5">
        <Field label="TVA à appliquer (%)">
          <Input
            type="number"
            min={0}
            step="0.1"
            className="max-w-40"
            value={taxRate}
            disabled={!canEdit}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            onBlur={() => {
              if (taxRate !== defaultTaxRate) void saveTaxRate(taxRate);
            }}
          />
        </Field>
      </div>
      <p className="text-sm text-slate-500">
        Ces taux sont proposés sur chaque ligne de devis (mode « taux horaire »). La remise client s’applique
        ensuite sur le taux affiché, pas sur les montants forfaitaires.
      </p>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Libellé</th>
              <th>Montant €/h</th>
              <th>Par défaut</th>
              <th>Actif</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {initialRates.map((rate) => (
              <tr key={rate.id}>
                <td>
                  <Input
                    defaultValue={rate.label}
                    disabled={!canEdit}
                    onBlur={(e) => {
                      if (e.target.value !== rate.label) void patchRate(rate.id, { label: e.target.value });
                    }}
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    defaultValue={rate.amount}
                    disabled={!canEdit}
                    className="w-28"
                    onBlur={(e) => {
                      const amount = Number(e.target.value);
                      if (amount !== rate.amount) void patchRate(rate.id, { amount });
                    }}
                  />
                </td>
                <td>
                  <input
                    type="radio"
                    name="defaultRate"
                    checked={rate.isDefault}
                    disabled={!canEdit}
                    onChange={() => void patchRate(rate.id, { isDefault: true, amount: rate.amount })}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={rate.active}
                    disabled={!canEdit}
                    onChange={(e) => void patchRate(rate.id, { active: e.target.checked })}
                  />
                </td>
                <td>
                  {rate.isDefault ? (
                    <span className="text-xs text-slate-400">{formatCurrency(rate.amount)}/h</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost px-2"
                      disabled={!canEdit}
                      onClick={() => void removeRate(rate.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit ? (
        <form onSubmit={createRate} className="card grid gap-4 p-5 sm:grid-cols-4">
          <Field label="Nouveau libellé">
            <Input name="label" required placeholder="Ex. PDR, Grêle…" />
          </Field>
          <Field label="Montant €/h">
            <Input name="amount" type="number" min={0} step="0.5" required defaultValue={75} />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="isDefault" />
            Définir par défaut
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={busy}>
              Ajouter
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-slate-500">La modification des taux est réservée aux estimateurs et administrateurs.</p>
      )}
      <ErrorText message={error} />
      {ok ? <p className="text-sm text-green-700">{ok}</p> : null}
    </div>
  );
}
