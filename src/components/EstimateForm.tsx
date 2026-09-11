"use client";

import { DragEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  DAMAGE_TYPES,
  DENT_ORIENTATIONS,
  ESTIMATE_STATUSES,
  REPAIR_METHODS,
} from "@/lib/constants";
import { computeLineTotal, computeEstimateTotals, applyHourlyDiscount, parseServicePricing, isMethodFixed, SERVICE_KEYS, SERVICE_LABELS, type ServicePricing } from "@/lib/calculations";
import { formatCurrency, toInputDate, cn } from "@/lib/utils";
import { Button, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";
import { CarPanelPicker } from "@/components/CarPanelPicker";
import { PanelLineDialog, type PanelLineDraft } from "@/components/PanelLineDialog";
import {
  applyHagelHoursToLines,
  computeHagelHours,
  firstPdrLineIndex,
  hagelSizeOptions,
  hagelVehicleExtrasWu,
  parseHagelExpertConfig,
} from "@/lib/hagelExpert";

type Line = {
  uid: string;
  panel: string;
  damageType: "DENT" | "SCRATCH" | "CRACK" | "PAINT_DAMAGE";
  repairMethod: "PDR" | "CONVENTIONAL" | "PANEL_REPLACEMENT";
  severity: "LIGHT" | "MEDIUM" | "HEAVY";
  dentCount: number;
  dentSize: number;
  orientation: "HORIZONTAL" | "VERTICAL";
  aluminum: boolean;
  glue: boolean;
  laborHours: number;
  laborRate: number;
  laborRateId?: string | null;
  partsCost: number;
  paintCost: number;
};

type LaborRateOption = { id: string; label: string; amount: number; isDefault: boolean; active: boolean };

const METHOD_SHORT: Record<Line["repairMethod"], string> = {
  PDR: "PDR",
  CONVENTIONAL: "Conventionnel",
  PANEL_REPLACEMENT: "Remplacement",
};

function newLineId() {
  return crypto.randomUUID();
}

export function EstimateForm({
  clients,
  vehicles,
  panels,
  laborRate,
  laborRates = [],
  taxRate,
  estimatorId,
  id,
  initial,
  diagramStyle = "exploded",
  panelMap,
  hagelExpert,
}: {
  clients: Array<{
    id: string;
    companyName?: string | null;
    firstName: string;
    lastName: string;
    discountPercent?: number | null;
  }>;
  vehicles: Array<{
    id: string;
    brand: string;
    model: string;
    licensePlate: string;
    clients: Array<{ clientId: string }>;
  }>;
  panels: string[];
  laborRate: number;
  laborRates?: LaborRateOption[];
  taxRate: number;
  estimatorId: string;
  id?: string;
  diagramStyle?: "assembled" | "exploded";
  panelMap?: Record<string, string>;
  hagelExpert?: unknown;
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
    dismantlingAmount?: number | null;
    servicePricing?: unknown;
    lineItems?: Array<
      Partial<Omit<Line, "orientation">> & {
        panel: string;
        orientation?: string | null;
        aluminum?: boolean | null;
        glue?: boolean | null;
      }
    >;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  function firstVehicleIdFor(cid: string) {
    if (!cid) return "";
    return vehicles.find((v) => v.clients.some((c) => c.clientId === cid))?.id ?? "";
  }
  const [vehicleId, setVehicleId] = useState(
    initial?.vehicleId || firstVehicleIdFor(initial?.clientId ?? "") || "",
  );
  const vat = taxRate;
  const [applyDiscount, setApplyDiscount] = useState(true);
  const [dismantlingAmount, setDismantlingAmount] = useState(Number(initial?.dismantlingAmount) || 0);
  const [servicePricing, setServicePricing] = useState<ServicePricing>(() =>
    parseServicePricing(initial?.servicePricing),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [editingPanel, setEditingPanel] = useState<string | null>(null);
  const [panelDraft, setPanelDraft] = useState<PanelLineDraft | null>(null);
  const hagel = useMemo(() => parseHagelExpertConfig(hagelExpert), [hagelExpert]);

  const defaultCatalog = laborRates.find((r) => r.isDefault && r.active) ?? laborRates.find((r) => r.active);
  const catalogById = useMemo(
    () => Object.fromEntries(laborRates.map((rate) => [rate.id, rate])),
    [laborRates],
  );
  const clientDiscount = Number(clients.find((c) => c.id === clientId)?.discountPercent) || 0;
  const activeDiscount = applyDiscount ? clientDiscount : 0;
  function pricedHourly(baseAmount: number, discount = activeDiscount) {
    return applyHourlyDiscount(baseAmount, discount);
  }

  function defaultRateAmount(discount = activeDiscount) {
    return pricedHourly(defaultCatalog?.amount ?? laborRate, discount);
  }

  function emptyLine(discount = activeDiscount): Line {
    return {
      uid: newLineId(),
      panel: "",
      damageType: "DENT",
      repairMethod: "PDR",
      severity: "LIGHT",
      dentCount: 0,
      dentSize: 20,
      orientation: "HORIZONTAL",
      aluminum: false,
      glue: false,
      laborHours: 0,
      laborRate: defaultRateAmount(discount),
      laborRateId: defaultCatalog?.id ?? null,
      partsCost: 0,
      paintCost: 0,
    };
  }

  function makeLine(
    patch: Partial<Omit<Line, "orientation">> & { orientation?: string | null } = {},
    keepStoredRate = false,
    discount = activeDiscount,
  ): Line {
    const base = emptyLine(discount);
    const rateId = keepStoredRate
      ? (patch.laborRateId ?? null)
      : (patch.laborRateId ?? defaultCatalog?.id ?? null);
    const catalog = (rateId && catalogById[rateId]) || defaultCatalog;
    const computed = catalog ? pricedHourly(catalog.amount, discount) : defaultRateAmount(discount);
    return {
      ...base,
      ...patch,
      uid: patch.uid || base.uid,
      dentSize: Number(patch.dentSize) || base.dentSize,
      orientation: patch.orientation === "VERTICAL" ? "VERTICAL" : "HORIZONTAL",
      aluminum: Boolean(patch.aluminum),
      glue: Boolean(patch.glue),
      laborRateId: rateId || (!keepStoredRate ? defaultCatalog?.id ?? null : null),
      laborRate: keepStoredRate && patch.laborRate != null ? Number(patch.laborRate) : computed,
    };
  }

  const [lines, setLines] = useState<Line[]>(
    initial?.lineItems?.length
      ? initial.lineItems.map((line) =>
          makeLine(
            {
              ...line,
              uid: line.uid || newLineId(),
              laborHours: Number(line.laborHours) || 0,
              laborRateId: line.laborRateId || defaultCatalog?.id || null,
            },
            true,
          ),
        )
      : [makeLine()],
  );

  const filteredVehicles = useMemo(
    () => (clientId ? vehicles.filter((v) => v.clients.some((c) => c.clientId === clientId)) : vehicles),
    [clientId, vehicles],
  );

  const totals = computeEstimateTotals({
    lineItems: lines,
    servicePricing,
    dismantlingAmount,
    taxRate: vat,
  });

  function repriceLines(current: Line[], discount: number) {
    return current.map((line) => {
      const catalog = (line.laborRateId && catalogById[line.laborRateId]) || defaultCatalog;
      if (!catalog) return line;
      return { ...line, laborRate: pricedHourly(catalog.amount, discount) };
    });
  }

  function withHagel(current: Line[]) {
    return applyHagelHoursToLines(current, hagel);
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => {
      const next = prev.map((line, i) => (i === index ? { ...line, ...patch } : line));
      const hagelFields = ["dentCount", "dentSize", "orientation", "aluminum", "glue", "repairMethod", "panel"];
      if (Object.keys(patch).some((key) => hagelFields.includes(key))) return withHagel(next);
      return next;
    });
  }

  function extrasForDraft(draft: PanelLineDraft) {
    const simulated = [
      ...lines.filter((line) => line.uid !== draft.uid && line.panel !== draft.panel),
      { ...makeLine(draft), uid: draft.uid || "draft" },
    ];
    return firstPdrLineIndex(simulated) === simulated.length - 1 ? hagelVehicleExtrasWu(hagel) : 0;
  }

  function openPanel(panel: string) {
    const existing = lines.find((line) => line.panel === panel);
    const draft = existing ?? makeLine({ panel, damageType: "DENT", dentCount: 1, dentSize: 20 });
    const extras = extrasForDraft(draft);
    setPanelDraft(
      draft.repairMethod === "PDR" ? { ...draft, laborHours: computeHagelHours(hagel, draft, extras) } : draft,
    );
    setEditingPanel(panel);
  }

  function savePanel(draft: PanelLineDraft) {
    setLines((prev) => {
      const byUid = draft.uid ? prev.findIndex((line) => line.uid === draft.uid) : -1;
      const byPanel = prev.findIndex((line) => line.panel === draft.panel);
      const idx = byUid >= 0 ? byUid : byPanel;
      let next: Line[];
      if (idx >= 0) {
        next = prev.map((line, i) => (i === idx ? { ...line, ...draft, uid: line.uid } : line));
      } else {
        const created = makeLine(draft);
        const blank = prev.findIndex((line) => !line.panel);
        next =
          blank >= 0
            ? prev.map((line, i) => (i === blank ? { ...created, uid: line.uid } : line))
            : [...prev, created];
      }
      return withHagel(next);
    });
    setEditingPanel(null);
    setPanelDraft(null);
  }

  function removePanel(panel: string) {
    setLines((prev) => {
      const next = prev.filter((line) => line.panel !== panel);
      return withHagel(next.length ? next : [makeLine()]);
    });
    setEditingPanel(null);
    setPanelDraft(null);
  }

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    setLines((prev) => {
      if (from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function onRowDragStart(index: number, e: DragEvent<HTMLElement>) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    setDragIndex(index);
  }

  function onRowDragOver(index: number, e: DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropIndex !== index) setDropIndex(index);
  }

  function onRowDrop(index: number, e: DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    reorder(Number.isFinite(from) ? from : (dragIndex ?? -1), index);
    setDragIndex(null);
    setDropIndex(null);
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
      discountType: "PERCENT",
      discountValue: 0,
      taxRate: vat,
      internalNotes: fd.get("internalNotes"),
      clientNotes: fd.get("clientNotes"),
      includePhotos: fd.get("includePhotos") === "on",
      dismantlingAmount,
      servicePricing,
      lineItems: withHagel(lines).map(({ uid: _uid, ...line }, i) => ({
        ...line,
        pricingMode: "HOURLY",
        fixedAmount: 0,
        sortOrder: i,
      })),
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

  const visibleRates = laborRates.filter((r) => r.active || lines.some((l) => l.laborRateId === r.id));
  const editingLine = editingPanel ? lines.find((line) => line.panel === editingPanel) : undefined;

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
              const nextId = e.target.value;
              const nextDiscount = Number(clients.find((c) => c.id === nextId)?.discountPercent) || 0;
              setClientId(nextId);
              setVehicleId(firstVehicleIdFor(nextId));
              setApplyDiscount(true);
              setLines((prev) => repriceLines(prev, nextDiscount));
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
        selected={[...new Set(lines.map((l) => l.panel).filter(Boolean))]}
        dentCounts={lines.reduce<Record<string, number>>((acc, line) => {
          if (!line.panel) return acc;
          acc[line.panel] = (acc[line.panel] ?? 0) + (Number(line.dentCount) || 0);
          return acc;
        }, {})}
        onToggle={openPanel}
        variant={diagramStyle}
        panelMap={panelMap}
      />

      <div className="card overflow-x-auto p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h2 className="font-semibold text-navy">Lignes de dommages</h2>
            {clientDiscount > 0 ? (
              <label className="flex max-w-xl cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-mist px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={applyDiscount}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setApplyDiscount(on);
                    setLines((prev) => repriceLines(prev, on ? clientDiscount : 0));
                  }}
                />
                <span className="font-semibold text-navy">
                  Appliquer la remise client ({clientDiscount} %)
                </span>
              </label>
            ) : null}
          </div>
          <Button type="button" variant="ghost" onClick={() => setLines((l) => [...l, makeLine()])}>
            <Plus size={16} /> Ligne
          </Button>
        </div>
        <table className="table line-table min-w-[1100px]">
          <colgroup>
            <col className="w-8" />
            <col />
            <col className="w-[7.5rem]" />
            <col className="w-[8rem]" />
            <col className="w-[3.75rem]" />
            <col className="w-[6.5rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-10" />
            <col className="w-10" />
            <col className="w-[4.25rem]" />
            <col className="w-[4.5rem]" />
            <col className="w-[4.5rem]" />
            <col className="w-[4.5rem]" />
            <col className="w-[5rem]" />
            <col className="w-8" />
          </colgroup>
          <thead>
            <tr>
              <th aria-label="Ordre" />
              <th>Pièce</th>
              <th>Type</th>
              <th>Méthode</th>
              <th>Nb</th>
              <th>Taille mm</th>
              <th>Orient.</th>
              <th title="Aluminium">Alu</th>
              <th title="Collage / traction">Col.</th>
              <th>Heures</th>
              <th>Taux</th>
              <th>Pièces</th>
              <th>Peint.</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => {
              const methodFixed = isMethodFixed(servicePricing, line.repairMethod);
              return (
                <tr
                  key={line.uid}
                  className={cn(
                    line.panel && "bg-mist",
                    dragIndex === i && "is-dragging",
                    dropIndex === i && dragIndex !== null && dragIndex !== i && "drop-target",
                  )}
                  onDragOver={(e) => onRowDragOver(i, e)}
                  onDrop={(e) => onRowDrop(i, e)}
                >
                  <td>
                    <div
                      className="drag-handle"
                      draggable={true}
                      title="Glisser pour réordonner"
                      onDragStart={(e) => onRowDragStart(i, e)}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDropIndex(null);
                      }}
                    >
                      <GripVertical size={15} />
                    </div>
                  </td>
                  <td>
                    <Select
                      className="table-select"
                      value={line.panel}
                      title={line.panel || "Pièce"}
                      onChange={(e) => updateLine(i, { panel: e.target.value })}
                      onDoubleClick={() => line.panel && openPanel(line.panel)}
                    >
                      <option value="">—</option>
                      {panels.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <Select
                      className="table-select"
                      value={line.damageType}
                      onChange={(e) => updateLine(i, { damageType: e.target.value as Line["damageType"] })}
                    >
                      {DAMAGE_TYPES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <Select
                      className="table-select"
                      value={line.repairMethod}
                      title={REPAIR_METHODS.find((m) => m.value === line.repairMethod)?.label}
                      onChange={(e) =>
                        updateLine(i, { repairMethod: e.target.value as Line["repairMethod"] })
                      }
                    >
                      {REPAIR_METHODS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {METHOD_SHORT[d.value]}
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
                      className="table-num"
                    />
                  </td>
                  <td>
                    <Select
                      className="table-select"
                      value={String(line.dentSize)}
                      onChange={(e) => updateLine(i, { dentSize: Number(e.target.value) })}
                    >
                      {hagelSizeOptions(hagel).map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <Select
                      className="table-select"
                      value={line.orientation}
                      onChange={(e) =>
                        updateLine(i, { orientation: e.target.value as Line["orientation"] })
                      }
                    >
                      {DENT_ORIENTATIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.value === "HORIZONTAL" ? "H" : "V"}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={line.aluminum}
                      aria-label="Aluminium"
                      onChange={(e) => updateLine(i, { aluminum: e.target.checked })}
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={line.glue}
                      aria-label="Collage"
                      onChange={(e) => updateLine(i, { glue: e.target.checked })}
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      value={line.laborHours}
                      readOnly={line.repairMethod === "PDR"}
                      title={line.repairMethod === "PDR" ? "Heures calculées Hagel Expert" : undefined}
                      onChange={(e) => {
                        if (line.repairMethod === "PDR") return;
                        updateLine(i, { laborHours: Number(e.target.value) });
                      }}
                      className="table-num"
                    />
                  </td>
                  <td>
                    {visibleRates.length > 1 ? (
                      <Select
                        className="table-select"
                        value={line.laborRateId || defaultCatalog?.id || ""}
                        onChange={(e) => {
                          const rate = catalogById[e.target.value];
                          updateLine(i, {
                            laborRateId: e.target.value || defaultCatalog?.id || null,
                            laborRate: rate ? pricedHourly(rate.amount) : defaultRateAmount(),
                          });
                        }}
                      >
                        {visibleRates.map((rate) => (
                          <option key={rate.id} value={rate.id}>
                            {pricedHourly(rate.amount)}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.laborRate}
                        onChange={(e) => updateLine(i, { laborRate: Number(e.target.value) })}
                        className="table-num table-num-lg"
                      />
                    )}
                  </td>
                  <td>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.partsCost}
                      onChange={(e) => updateLine(i, { partsCost: Number(e.target.value) })}
                      className="table-num table-num-lg"
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.paintCost}
                      onChange={(e) => updateLine(i, { paintCost: Number(e.target.value) })}
                      className="table-num table-num-lg"
                    />
                  </td>
                  <td className="whitespace-nowrap text-right text-xs font-semibold tabular-nums">
                    {methodFixed ? (
                      <span className="font-normal text-slate-400">—</span>
                    ) : (
                      formatCurrency(computeLineTotal(line))
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost px-1.5 py-1"
                      title="Supprimer la ligne"
                      onClick={() =>
                        setLines((l) => {
                          const next = l.filter((_, idx) => idx !== i);
                          return withHagel(next.length ? next : [makeLine()]);
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold text-navy">Forfaits par service</h2>
          <div className="space-y-3">
            {SERVICE_KEYS.map((key) => (
              <div key={key} className="grid grid-cols-[7.5rem_8rem_1fr] items-center gap-2">
                <span className="text-sm font-medium text-navy">{SERVICE_LABELS[key]}</span>
                <Select
                  className="table-select"
                  value={servicePricing[key].mode}
                  onChange={(e) => {
                    const mode = e.target.value === "FIXED" ? "FIXED" : "HOURLY";
                    setServicePricing((prev) => ({ ...prev, [key]: { ...prev[key], mode } }));
                  }}
                >
                  <option value="HOURLY">Horaire</option>
                  <option value="FIXED">Forfait</option>
                </Select>
                {servicePricing[key].mode === "FIXED" ? (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={servicePricing[key].amount}
                    onChange={(e) =>
                      setServicePricing((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], amount: Number(e.target.value) || 0 },
                      }))
                    }
                  />
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
          <Field label="Dégarnissage / montage">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={dismantlingAmount}
              onChange={(e) => setDismantlingAmount(Number(e.target.value) || 0)}
            />
          </Field>
        </div>
        <div className="card space-y-3 p-6">
          <h2 className="font-semibold text-navy">Total réparation</h2>
          <dl className="space-y-2 text-sm">
            {SERVICE_KEYS.map((key) => (
              <div key={key} className="flex justify-between">
                <dt>{SERVICE_LABELS[key]}</dt>
                <dd>{formatCurrency(totals.services[key])}</dd>
              </div>
            ))}
            <div className="flex justify-between">
              <dt>{SERVICE_LABELS.paint}</dt>
              <dd>{formatCurrency(totals.services.paint)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{SERVICE_LABELS.dismantling}</dt>
              <dd>{formatCurrency(totals.services.dismantling)}</dd>
            </div>
          </dl>
        </div>
        <div className="card space-y-4 p-6">
          <Field label="Notes internes (non imprimées)">
            <Textarea name="internalNotes" defaultValue={initial?.internalNotes ?? ""} />
          </Field>
          <Field label="Notes client / conditions (sur le PDF)">
            <Textarea name="clientNotes" defaultValue={initial?.clientNotes ?? ""} />
          </Field>
        </div>
        <div className="card space-y-3 p-6">
          <h2 className="font-semibold text-navy">Prix total</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Sous-total</dt>
              <dd>{formatCurrency(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>TVA {vat} %</dt>
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
      {panelDraft && editingPanel ? (
        <PanelLineDialog
          open
          title={editingLine ? `Modifier ${editingPanel}` : `Ajouter ${editingPanel}`}
          panels={panels}
          draft={panelDraft}
          hagel={hagel}
          extrasWu={extrasForDraft(panelDraft)}
          onClose={() => {
            setEditingPanel(null);
            setPanelDraft(null);
          }}
          onSave={savePanel}
          onRemove={editingLine ? () => removePanel(editingPanel) : undefined}
        />
      ) : null}
    </form>
  );
}
