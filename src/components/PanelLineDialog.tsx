"use client";

import { useEffect, useMemo, useState } from "react";
import { DAMAGE_TYPES, DENT_ORIENTATIONS, REPAIR_METHODS } from "@/lib/constants";
import { computeHagelHours, computeHagelWorkUnits, hagelSizeOptions, type HagelExpertConfig } from "@/lib/hagelExpert";
import { Button, Field, Input, Select } from "@/components/ui";

export type PanelLineDraft = {
  uid?: string;
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

export function PanelLineDialog({
  open,
  title,
  panels,
  draft,
  hagel,
  extrasWu = 0,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean;
  title: string;
  panels: string[];
  draft: PanelLineDraft;
  hagel: HagelExpertConfig;
  extrasWu?: number;
  onClose: () => void;
  onSave: (draft: PanelLineDraft) => void;
  onRemove?: () => void;
}) {
  function withHours(value: PanelLineDraft) {
    if (value.repairMethod !== "PDR") return value;
    return { ...value, laborHours: computeHagelHours(hagel, value, extrasWu) };
  }

  const [form, setForm] = useState(() => withHours(draft));
  const sizes = hagelSizeOptions(hagel);

  useEffect(() => {
    if (!open) return;
    setForm(withHours(draft));
  }, [open, draft, extrasWu, hagel]);

  const preview = useMemo(() => {
    if (form.repairMethod !== "PDR") return null;
    const wu = computeHagelWorkUnits(hagel, form, extrasWu);
    const hours = computeHagelHours(hagel, form, extrasWu);
    return { wu, hours };
  }, [form, hagel, extrasWu]);

  function patch(partial: Partial<PanelLineDraft>) {
    setForm((prev) => {
      const next = { ...prev, ...partial };
      if (next.repairMethod === "PDR") {
        next.laborHours = computeHagelHours(hagel, next, extrasWu);
      }
      return next;
    });
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-line-title"
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-5 py-4">
          <h2 id="panel-line-title" className="text-lg font-semibold text-navy">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Les valeurs validées mettent à jour la ligne du tableau.</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Pièce">
            <Select value={form.panel} onChange={(e) => patch({ panel: e.target.value })}>
              <option value="">—</option>
              {panels.map((panel) => (
                <option key={panel} value={panel}>
                  {panel}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type de dommage">
            <Select
              value={form.damageType}
              onChange={(e) => patch({ damageType: e.target.value as PanelLineDraft["damageType"] })}
            >
              {DAMAGE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Méthode">
            <Select
              value={form.repairMethod}
              onChange={(e) => patch({ repairMethod: e.target.value as PanelLineDraft["repairMethod"] })}
            >
              {REPAIR_METHODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre de bosses">
            <Input
              type="number"
              min={0}
              value={form.dentCount}
              onChange={(e) => patch({ dentCount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Taille (mm)">
            <Select value={String(form.dentSize)} onChange={(e) => patch({ dentSize: Number(e.target.value) })}>
              {sizes.map((size) => (
                <option key={size} value={size}>
                  {size} mm
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Orientation">
            <Select
              value={form.orientation}
              onChange={(e) => patch({ orientation: e.target.value as PanelLineDraft["orientation"] })}
            >
              {DENT_ORIENTATIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Heures">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.laborHours}
              readOnly={form.repairMethod === "PDR"}
              title={form.repairMethod === "PDR" ? "Heures calculées selon Hagel Expert" : undefined}
              onChange={(e) => {
                if (form.repairMethod === "PDR") return;
                setForm((prev) => ({ ...prev, laborHours: Number(e.target.value) }));
              }}
            />
            {preview ? (
              <p className="mt-1 text-xs text-slate-500">
                Hagel Expert : {preview.wu} AW → {preview.hours} h
              </p>
            ) : null}
          </Field>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={form.aluminum}
              onChange={(e) => patch({ aluminum: e.target.checked })}
            />
            Aluminium (+{hagel.aluminumPercent} %)
          </label>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input type="checkbox" checked={form.glue} onChange={(e) => patch({ glue: e.target.checked })} />
            Collage / traction (+{hagel.gluePercent} %)
          </label>
          <Field label="Pièces (€)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.partsCost}
              onChange={(e) => patch({ partsCost: Number(e.target.value) })}
            />
          </Field>
          <Field label="Peinture (€)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.paintCost}
              onChange={(e) => patch({ paintCost: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-4">
          {onRemove ? (
            <Button type="button" variant="danger" onClick={onRemove}>
              Retirer le panneau
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" onClick={() => onSave(form)} disabled={!form.panel}>
              Valider
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
