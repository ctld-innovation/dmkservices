"use client";

import { DragEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  DAMAGE_TYPES,
  ESTIMATE_REPAIR_METHODS,
  ESTIMATE_STATUSES,
  sortByPanelOrder,
} from "@/lib/constants";
import { computeLineTotal, computeLineLabor, computeEstimateTotals, parseServicePricing, isMethodFixed, FORFAIT_SERVICE_KEYS, SERVICE_LABELS, serviceTotalRows, type ServicePricing } from "@/lib/calculations";
import { formatCurrency, toInputDate, cn, round2 } from "@/lib/utils";
import { Button, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";
import { CarPanelPicker } from "@/components/CarPanelPicker";
import { explodedKindStyles, explodedStylesFromLines } from "@/lib/explodedStyles";
import { PanelLineDialog, type PanelLineDraft } from "@/components/PanelLineDialog";
import { VehicleForm } from "@/components/VehicleForm";
import {
  applyHagelHoursToLines,
  computeHagelHours,
  hagelScaledWu,
  hagelSizeOptions,
  parseHagelExpertConfig,
  type HagelVehicleExtras,
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
  dap: boolean;
  paintReserve: boolean;
  extraWu: number;
  laborHours: number;
  laborRate: number;
  laborRateId?: string | null;
  partsCost: number;
  paintCost: number;
};

type LaborRateOption = { id: string; label: string; amount: number; isDefault: boolean; active: boolean };

const METHOD_SHORT: Record<Line["repairMethod"], string> = {
  PDR: "DSP",
  CONVENTIONAL: "Conv.",
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
  explodedColors,
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
  explodedColors?: unknown;
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
    applyVehiclePrep?: boolean | null;
    applyVehicleFinish?: boolean | null;
    servicePricing?: unknown;
    lineItems?: Array<
      Partial<Omit<Line, "orientation">> & {
        panel: string;
        orientation?: string | null;
        aluminum?: boolean | null;
        glue?: boolean | null;
        dap?: boolean | null;
        paintReserve?: boolean | null;
        extraWu?: number | null;
      }
    >;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [vehicleList, setVehicleList] = useState(vehicles);
  const [vehicleModal, setVehicleModal] = useState(false);
  useEffect(() => {
    void fetch("/api/lookups");
  }, []);
  function firstVehicleIdFor(cid: string, list = vehicleList) {
    if (!cid) return "";
    return list.find((v) => v.clients.some((c) => c.clientId === cid))?.id ?? "";
  }
  const [vehicleId, setVehicleId] = useState(
    initial?.vehicleId || firstVehicleIdFor(initial?.clientId ?? "", vehicles) || "",
  );
  const vat = taxRate;
  const [dismantlingAmount, setDismantlingAmount] = useState(Number(initial?.dismantlingAmount) || 0);
  const [servicePricing, setServicePricing] = useState<ServicePricing>(() =>
    parseServicePricing(initial?.servicePricing),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [editingPanel, setEditingPanel] = useState<string | null>(null);
  const [panelDraft, setPanelDraft] = useState<PanelLineDraft | null>(null);
  const [rateCatalog, setRateCatalog] = useState(laborRates);
  const [hagelRaw, setHagelRaw] = useState(hagelExpert);
  const [recalculating, setRecalculating] = useState(false);
  const hagel = useMemo(() => parseHagelExpertConfig(hagelRaw), [hagelRaw]);
  const [vehicleExtras, setVehicleExtras] = useState<HagelVehicleExtras>({
    preparation: Boolean(initial?.applyVehiclePrep),
    finish: Boolean(initial?.applyVehicleFinish),
  });

  const defaultCatalog = rateCatalog.find((r) => r.isDefault && r.active) ?? rateCatalog.find((r) => r.active);
  const catalogById = useMemo(
    () => Object.fromEntries(rateCatalog.map((rate) => [rate.id, rate])),
    [rateCatalog],
  );
  function pricedHourly(baseAmount: number) {
    return Number(baseAmount) || 0;
  }

  function defaultRateAmount() {
    return pricedHourly(defaultCatalog?.amount ?? laborRate);
  }

  function emptyLine(): Line {
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
      dap: false,
      paintReserve: false,
      extraWu: 0,
      laborHours: 0,
      laborRate: defaultRateAmount(),
      laborRateId: defaultCatalog?.id ?? null,
      partsCost: 0,
      paintCost: 0,
    };
  }

  function makeLine(
    patch: Partial<Omit<Line, "orientation">> & { orientation?: string | null } = {},
    keepStoredRate = false,
  ): Line {
    const base = emptyLine();
    const rateId = keepStoredRate
      ? (patch.laborRateId ?? null)
      : (patch.laborRateId ?? defaultCatalog?.id ?? null);
    const catalog = (rateId && catalogById[rateId]) || defaultCatalog;
    const computed = catalog ? pricedHourly(catalog.amount) : defaultRateAmount();
    return {
      ...base,
      ...patch,
      uid: patch.uid || base.uid,
      dentSize: Number(patch.dentSize) || base.dentSize,
      orientation: patch.orientation === "VERTICAL" ? "VERTICAL" : "HORIZONTAL",
      aluminum: Boolean(patch.aluminum),
      glue: Boolean(patch.glue),
      dap: Boolean(patch.dap),
      paintReserve: Boolean(patch.paintReserve),
      extraWu: Number(patch.extraWu) || 0,
      laborHours: patch.repairMethod === "PANEL_REPLACEMENT" ? 0 : (Number(patch.laborHours) || base.laborHours),
      repairMethod: patch.repairMethod === "PANEL_REPLACEMENT" ? "PANEL_REPLACEMENT" : "PDR",
      laborRateId: rateId || (!keepStoredRate ? defaultCatalog?.id ?? null : null),
      laborRate: keepStoredRate && patch.laborRate != null ? Number(patch.laborRate) : computed,
    };
  }

  const [lines, setLines] = useState<Line[]>(() => {
    const mapped = initial?.lineItems?.length
      ? sortByPanelOrder(
          initial.lineItems.map((line) =>
            makeLine(
              {
                ...line,
                uid: line.uid || newLineId(),
                laborHours: Number(line.laborHours) || 0,
                laborRateId: line.laborRateId || defaultCatalog?.id || null,
              },
              true,
            ),
          ),
        )
      : [makeLine()];
    return applyHagelHoursToLines(mapped, hagel);
  });

  const filteredVehicles = useMemo(
    () => (clientId ? vehicleList.filter((v) => v.clients.some((c) => c.clientId === clientId)) : vehicleList),
    [clientId, vehicleList],
  );

  const totals = computeEstimateTotals({
    lineItems: lines,
    servicePricing,
    dismantlingAmount,
    taxRate: vat,
    applyVehiclePrep: vehicleExtras.preparation,
    applyVehicleFinish: vehicleExtras.finish,
    hagelExpert: hagel,
    extrasLaborRate: defaultRateAmount(),
  });

  function withHagel(current: Line[]) {
    return applyHagelHoursToLines(current, hagel);
  }

  function toggleVehicleExtra(key: "preparation" | "finish", on: boolean) {
    setVehicleExtras((prev) => ({ ...prev, [key]: on }));
  }

  async function recalculateAll() {
    setRecalculating(true);
    setError(null);
    try {
      const [ratesRes, settingsRes] = await Promise.all([fetch("/api/labor-rates"), fetch("/api/settings")]);
      if (!ratesRes.ok || !settingsRes.ok) {
        throw new Error("Impossible de charger les barèmes");
      }
      const rates = (await ratesRes.json()) as LaborRateOption[];
      const settings = (await settingsRes.json()) as { hagelExpert?: unknown; defaultLaborRate?: number };
      const nextHagel = parseHagelExpertConfig(settings.hagelExpert);
      const catalog = Object.fromEntries(rates.map((rate) => [rate.id, rate]));
      const fallback = rates.find((rate) => rate.isDefault && rate.active) ?? rates.find((rate) => rate.active);
      setRateCatalog(rates);
      setHagelRaw(settings.hagelExpert);
      setLines((prev) =>
        applyHagelHoursToLines(
          prev.map((line) => {
            const rate = (line.laborRateId && catalog[line.laborRateId]) || fallback;
            return {
              ...line,
              laborRate: rate ? pricedHourly(rate.amount) : line.laborRate,
              laborRateId: line.laborRateId || fallback?.id || null,
            };
          }),
          nextHagel,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recalcul impossible");
    } finally {
      setRecalculating(false);
    }
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => {
      const next = prev.map((line, i) => (i === index ? { ...line, ...patch } : line));
      const hagelFields = [
        "dentCount",
        "dentSize",
        "orientation",
        "aluminum",
        "glue",
        "dap",
        "extraWu",
        "repairMethod",
        "panel",
      ];
      if (Object.keys(patch).some((key) => hagelFields.includes(key))) {
        return sortByPanelOrder(withHagel(next));
      }
      return patch.panel !== undefined ? sortByPanelOrder(next) : next;
    });
  }

  function openPanel(panel: string) {
    const existing = lines.find((line) => line.panel === panel);
    const draft = existing ?? makeLine({ panel, damageType: "DENT", dentCount: 0, dentSize: 20 });
    setPanelDraft(
      draft.repairMethod === "PDR" ? { ...draft, laborHours: computeHagelHours(hagel, draft, 0) } : draft,
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
      return sortByPanelOrder(withHagel(next));
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
      applyVehiclePrep: Boolean(vehicleExtras.preparation),
      applyVehicleFinish: Boolean(vehicleExtras.finish),
      servicePricing,
      lineItems: sortByPanelOrder(withHagel(lines)).map(({ uid: _uid, ...line }, i) => ({
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

  const visibleRates = rateCatalog.filter((r) => r.active || lines.some((l) => l.laborRateId === r.id));
  const editingLine = editingPanel ? lines.find((line) => line.panel === editingPanel) : undefined;

  return (
    <>
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
              setClientId(nextId);
              setVehicleId(firstVehicleIdFor(nextId));
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
        <div>
          <span className="label">Véhicule</span>
          <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {filteredVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} ({v.licensePlate})
              </option>
            ))}
          </Select>
          {clientId ? (
            <button
              type="button"
              className="mt-1.5 text-sm font-semibold text-navy hover:underline"
              onClick={() => setVehicleModal(true)}
            >
              + Ajouter un véhicule
            </button>
          ) : null}
        </div>
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
        panelStyles={explodedStylesFromLines(lines)}
        kindStyles={explodedKindStyles(explodedColors)}
        onToggle={openPanel}
        panelMap={panelMap}
      />

      <div className="card overflow-x-auto p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-navy">Lignes de dommages</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" disabled={recalculating} onClick={() => void recalculateAll()}>
              <RefreshCw size={16} className={recalculating ? "animate-spin" : undefined} />
              {recalculating ? "Recalcul…" : "Tout recalculer"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setLines((l) => [...l, makeLine()])}>
              <Plus size={16} /> Ligne
            </Button>
          </div>
        </div>
        <table className="table line-table min-w-[1180px]">
          <colgroup>
            <col className="w-8" />
            <col />
            <col className="w-[7.5rem]" />
            <col className="w-[8rem]" />
            <col className="w-[3.75rem]" />
            <col className="w-[6.5rem]" />
            <col className="w-10" />
            <col className="w-10" />
            <col className="w-10" />
            <col className="w-10" />
            <col className="w-[4rem]" />
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
              <th title="Aluminium">Alu</th>
              <th title="DAP">DAP</th>
              <th title="Colle">Col.</th>
              <th title="Réserve peinture">RP</th>
              <th title="Extra UT">Ex UT</th>
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
                      value={line.repairMethod === "CONVENTIONAL" ? "PDR" : line.repairMethod}
                      title={ESTIMATE_REPAIR_METHODS.find((m) => m.value === (line.repairMethod === "CONVENTIONAL" ? "PDR" : line.repairMethod))?.label}
                      onChange={(e) =>
                        updateLine(i, { repairMethod: e.target.value as Line["repairMethod"] })
                      }
                    >
                      {ESTIMATE_REPAIR_METHODS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {METHOD_SHORT[d.value]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    {line.repairMethod === "PANEL_REPLACEMENT" ? (
                      <span className="block text-center text-slate-400">—</span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        value={line.dentCount}
                        onChange={(e) => updateLine(i, { dentCount: Number(e.target.value) })}
                        className="table-num"
                      />
                    )}
                  </td>
                  <td>
                    {line.repairMethod === "PANEL_REPLACEMENT" ? (
                      <span className="block text-center text-slate-400">—</span>
                    ) : (
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
                    )}
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
                      checked={line.dap}
                      aria-label="DAP"
                      onChange={(e) => updateLine(i, { dap: e.target.checked })}
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={line.glue}
                      aria-label="Colle"
                      onChange={(e) => updateLine(i, { glue: e.target.checked })}
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={line.paintReserve}
                      aria-label="Réserve peinture"
                      onChange={(e) => updateLine(i, { paintReserve: e.target.checked })}
                    />
                  </td>
                  <td>
                    {line.repairMethod === "PANEL_REPLACEMENT" ? (
                      <span className="block text-center text-slate-400">—</span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={line.extraWu}
                        onChange={(e) => updateLine(i, { extraWu: Number(e.target.value) || 0 })}
                        className="table-num"
                      />
                    )}
                  </td>
                  <td>
                    {line.repairMethod === "PANEL_REPLACEMENT" ? (
                      <span className="block text-center text-slate-400">—</span>
                    ) : (
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
                    )}
                  </td>
                  <td>
                    {line.repairMethod === "PANEL_REPLACEMENT" ? (
                      <span className="block text-center text-slate-400">—</span>
                    ) : visibleRates.length > 1 ? (
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
            {FORFAIT_SERVICE_KEYS.map((key) => (
              <div key={key} className="grid grid-cols-[7.5rem_8rem_1fr] items-center gap-2">
                <span className="text-sm font-medium text-navy">{SERVICE_LABELS[key]}</span>
                <Select
                  className="table-select"
                  value={servicePricing[key].mode}
                  onChange={(e) => {
                    const mode = e.target.value === "FIXED" ? "FIXED" : "HOURLY";
                    setServicePricing((prev) => {
                      const amount =
                        mode === "FIXED" && !(Number(prev[key].amount) > 0)
                          ? round2(
                              lines
                                .filter((line) => line.repairMethod === key)
                                .reduce((sum, line) => sum + computeLineLabor(line), 0),
                            )
                          : prev[key].amount;
                      return { ...prev, [key]: { ...prev[key], mode, amount } };
                    });
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
            <label className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={Boolean(vehicleExtras.preparation)}
                onChange={(e) => toggleVehicleExtra("preparation", e.target.checked)}
              />
              Préparation véhicule (+{hagelScaledWu(hagel, hagel.preparationWu)} UT)
            </label>
            <label className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={Boolean(vehicleExtras.finish)}
                onChange={(e) => toggleVehicleExtra("finish", e.target.checked)}
              />
              Finition véhicule (+{hagelScaledWu(hagel, hagel.finishVehicle)} UT)
            </label>
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
            {serviceTotalRows(totals, true).map((row) => (
              <div key={row.label} className="flex justify-between">
                <dt>{row.label}</dt>
                <dd>{formatCurrency(row.value)}</dd>
              </div>
            ))}
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
    </form>
      {panelDraft && editingPanel ? (
        <PanelLineDialog
          open
          title={editingLine ? `Modifier ${editingPanel}` : `Ajouter ${editingPanel}`}
          panels={panels}
          draft={panelDraft}
          hagel={hagel}
          extrasWu={0}
          onClose={() => {
            setEditingPanel(null);
            setPanelDraft(null);
          }}
          onSave={savePanel}
          onRemove={editingLine ? () => removePanel(editingPanel) : undefined}
        />
      ) : null}
      {vehicleModal && clientId ? (
        <div className="modal-overlay" role="presentation" onClick={() => setVehicleModal(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-vehicle-title"
            className="modal-card modal-card-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-line px-5 py-4">
              <h2 id="new-vehicle-title" className="text-lg font-semibold text-navy">
                Ajouter un véhicule
              </h2>
              <p className="mt-1 text-sm text-slate-500">Le véhicule sera lié au client du devis.</p>
            </div>
            <div className="p-5">
              <VehicleForm
                clients={clients.filter((c) => c.id === clientId)}
                lockToClientId={clientId}
                compact
                onCancel={() => setVehicleModal(false)}
                onSaved={(vehicle) => {
                  setVehicleList((prev) => [...prev, vehicle]);
                  setVehicleId(vehicle.id);
                  setVehicleModal(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
