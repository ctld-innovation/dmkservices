"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  DAMAGE_TYPES,
  ESTIMATE_STATUSES,
  REPAIR_METHODS,
  SEVERITIES,
} from "@/lib/constants";
import { computeLineTotal, computeTotals } from "@/lib/calculations";
import { formatCurrency, toInputDate, cn } from "@/lib/utils";
import { Button, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";
import { CarPanelPicker } from "@/components/CarPanelPicker";

type Line = {
  panel: string;
  damageType: "DENT" | "SCRATCH" | "CRACK" | "PAINT_DAMAGE";
  repairMethod: "PDR" | "CONVENTIONAL" | "PANEL_REPLACEMENT";
  severity: "LIGHT" | "MEDIUM" | "HEAVY";
  dentCount: number;
  laborHours: number;
  laborRate: number;
  partsCost: number;
  paintCost: number;
};

const emptyLine = (rate: number): Line => ({
  panel: "",
  damageType: "DENT",
  repairMethod: "PDR",
  severity: "LIGHT",
  dentCount: 0,
  laborHours: 0,
  laborRate: rate,
  partsCost: 0,
  paintCost: 0,
});

export function EstimateForm({
  clients,
  vehicles,
  panels,
  laborRate,
  taxRate,
  estimatorId,
  id,
  initial,
}: {
  clients: Array<{ id: string; companyName?: string | null; firstName: string; lastName: string }>;
  vehicles: Array<{
    id: string;
    brand: string;
    model: string;
    licensePlate: string;
    clients: Array<{ clientId: string }>;
  }>;
  panels: string[];
  laborRate: number;
  taxRate: number;
  estimatorId: string;
  id?: string;
  initial?: {
    date?: Date | string;
    damageDate?: Date | string | null;
    clientId?: string;
    vehicleId?: string;
    status?: string;
    discountType?: "PERCENT" | "FIXED";
    discountValue?: number;
    taxRate?: number;
    internalNotes?: string | null;
    clientNotes?: string | null;
    includePhotos?: boolean;
    lineItems?: Line[];
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId ?? "");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(initial?.discountType ?? "PERCENT");
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? 0);
  const [vat, setVat] = useState(initial?.taxRate ?? taxRate);
  const [lines, setLines] = useState<Line[]>(
    initial?.lineItems?.length ? initial.lineItems : [emptyLine(laborRate)],
  );

  const filteredVehicles = useMemo(
    () => (clientId ? vehicles.filter((v) => v.clients.some((c) => c.clientId === clientId)) : vehicles),
    [clientId, vehicles],
  );

  const totals = computeTotals(
    lines.map((l) => ({ ...l, lineTotal: computeLineTotal(l) })),
    discountType,
    discountValue,
    vat,
  );

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function togglePanel(panel: string) {
    setLines((prev) => {
      const existing = prev.findIndex((line) => line.panel === panel);
      if (existing >= 0) {
        const next = prev.filter((_, i) => i !== existing);
        return next.length ? next : [emptyLine(laborRate)];
      }
      const dentLine: Line = {
        ...emptyLine(laborRate),
        panel,
        damageType: "DENT",
        dentCount: 1,
      };
      const blank = prev.findIndex((line) => !line.panel);
      if (blank >= 0) {
        return prev.map((line, i) => (i === blank ? dentLine : line));
      }
      return [...prev, dentLine];
    });
  }

  function move(index: number, dir: -1 | 1) {
    setLines((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function onSubmit(status?: string) {
    if (!clientId || !vehicleId) {
      setError("Sélectionnez un client et un véhicule");
      return;
    }
    if (lines.some((l) => !l.panel)) {
      setError("Chaque ligne doit avoir une pièce");
      return;
    }
    setLoading(true);
    setError(null);
    const form = document.getElementById("estimate-form") as HTMLFormElement;
    const fd = new FormData(form);
    const payload = {
      date: fd.get("date"),
      damageDate: fd.get("damageDate") || null,
      clientId,
      vehicleId,
      estimatorId,
      status: status || fd.get("status") || "DRAFT",
      discountType,
      discountValue,
      taxRate: vat,
      internalNotes: fd.get("internalNotes"),
      clientNotes: fd.get("clientNotes"),
      includePhotos: fd.get("includePhotos") === "on",
      lineItems: lines.map((line, i) => ({ ...line, sortOrder: i })),
    };
    const res = await fetch(id ? `/api/estimates/${id}` : "/api/estimates", {
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
    router.push(`/estimates/${data.id ?? id}`);
    router.refresh();
  }

  return (
    <form
      id="estimate-form"
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
    >
      <div className="card grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Date du devis">
          <Input name="date" type="date" required defaultValue={toInputDate(initial?.date ?? new Date())} />
        </Field>
        <Field label="Date du sinistre / grêle">
          <Input name="damageDate" type="date" defaultValue={toInputDate(initial?.damageDate ?? null)} />
        </Field>
        <Field label="Statut">
          <Select name="status" defaultValue={initial?.status ?? "DRAFT"}>
            {ESTIMATE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Client">
          <Select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setVehicleId("");
            }}
          >
            <option value="">Sélectionner…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName ? `${c.companyName} — ` : ""}
                {c.firstName} {c.lastName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Véhicule">
          <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {filteredVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} ({v.licensePlate})
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="includePhotos" defaultChecked={initial?.includePhotos} />
          Inclure les photos sur le PDF
        </label>
      </div>

      <CarPanelPicker
        selected={lines.map((l) => l.panel).filter(Boolean)}
        dentCounts={Object.fromEntries(lines.filter((l) => l.panel).map((l) => [l.panel, l.dentCount]))}
        onToggle={togglePanel}
      />

      <div className="card overflow-x-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-navy">Lignes de dommages</h2>
          <Button type="button" variant="ghost" onClick={() => setLines((l) => [...l, emptyLine(laborRate)])}>
            <Plus size={16} /> Ligne
          </Button>
        </div>
        <table className="table min-w-[1100px]">
          <thead>
            <tr>
              <th>Pièce</th>
              <th>Dommage</th>
              <th>Méthode</th>
              <th>Sévérité</th>
              <th>Bosses</th>
              <th>Heures</th>
              <th>Taux €/h</th>
              <th>Pièces</th>
              <th>Peinture</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className={cn(line.panel && "bg-mist")}>
                <td>
                  <Select value={line.panel} onChange={(e) => updateLine(i, { panel: e.target.value })}>
                    <option value="">—</option>
                    {panels.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Select value={line.damageType} onChange={(e) => updateLine(i, { damageType: e.target.value as Line["damageType"] })}>
                    {DAMAGE_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Select
                    value={line.repairMethod}
                    onChange={(e) => updateLine(i, { repairMethod: e.target.value as Line["repairMethod"] })}
                  >
                    {REPAIR_METHODS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Select value={line.severity} onChange={(e) => updateLine(i, { severity: e.target.value as Line["severity"] })}>
                    {SEVERITIES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Input
                    type="number"
                    min={0}
                    value={line.dentCount}
                    onChange={(e) => updateLine(i, { dentCount: Number(e.target.value) })}
                    className="w-20"
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={line.laborHours}
                    onChange={(e) => updateLine(i, { laborHours: Number(e.target.value) })}
                    className="w-20"
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={line.laborRate}
                    onChange={(e) => updateLine(i, { laborRate: Number(e.target.value) })}
                    className="w-24"
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.partsCost}
                    onChange={(e) => updateLine(i, { partsCost: Number(e.target.value) })}
                    className="w-24"
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.paintCost}
                    onChange={(e) => updateLine(i, { paintCost: Number(e.target.value) })}
                    className="w-24"
                  />
                </td>
                <td className="font-semibold">{formatCurrency(computeLineTotal(line))}</td>
                <td>
                  <div className="flex gap-1">
                    <button type="button" className="btn btn-ghost px-2" onClick={() => move(i, -1)}>
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" className="btn btn-ghost px-2" onClick={() => move(i, 1)}>
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost px-2"
                      onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <Field label="Notes internes (non imprimées)">
            <Textarea name="internalNotes" defaultValue={initial?.internalNotes ?? ""} />
          </Field>
          <Field label="Notes client / conditions (sur le PDF)">
            <Textarea name="clientNotes" defaultValue={initial?.clientNotes ?? ""} />
          </Field>
        </div>
        <div className="card space-y-3 p-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type de remise">
              <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FIXED")}>
                <option value="PERCENT">Pourcentage</option>
                <option value="FIXED">Montant fixe</option>
              </Select>
            </Field>
            <Field label={discountType === "PERCENT" ? "Remise %" : "Remise €"}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
              />
            </Field>
            <Field label="Taux de TVA %">
              <Input type="number" min={0} step="0.1" value={vat} onChange={(e) => setVat(Number(e.target.value))} />
            </Field>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Sous-total</dt>
              <dd>{formatCurrency(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Remise</dt>
              <dd>-{formatCurrency(totals.discount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>TVA</dt>
              <dd>{formatCurrency(totals.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-navy">
              <dt>Total TTC</dt>
              <dd>{formatCurrency(totals.grandTotal)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <ErrorText message={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="navy" disabled={loading} onClick={() => onSubmit("SENT")}>
          Enregistrer et marquer envoyé
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
