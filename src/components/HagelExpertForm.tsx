"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import {
  defaultHagelExpertConfig,
  parseHagelExpertConfig,
  type DentOrientation,
  type HagelExpertConfig,
  type HagelTableRow,
} from "@/lib/hagelExpert";

function setCell(table: HagelTableRow[], dents: number, sizeIndex: number, orientation: DentOrientation, value: number) {
  const next = table.map((row) => ({ d: row.d, h: [...row.h], v: [...row.v] }));
  let row = next.find((item) => item.d === dents);
  if (!row) {
    const sizes = next[0]?.h.length ?? 8;
    row = { d: dents, h: Array(sizes).fill(0), v: Array(sizes).fill(0) };
    next.push(row);
    next.sort((a, b) => a.d - b.d);
  }
  if (orientation === "VERTICAL") row.v[sizeIndex] = value;
  else row.h[sizeIndex] = value;
  return next;
}

export function HagelExpertForm({
  initial,
  canEdit,
}: {
  initial: unknown;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<HagelExpertConfig>(() => parseHagelExpertConfig(initial));
  const [orientation, setOrientation] = useState<DentOrientation>("HORIZONTAL");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const maxRows = Math.min(
    80,
    orientation === "VERTICAL" ? config.maxDentsVertical : config.maxDentsHorizontal,
  );
  const rows = useMemo(() => {
    const byDent = new Map(config.table.map((row) => [row.d, row]));
    return Array.from({ length: maxRows }, (_, i) => {
      const dents = i + 1;
      return byDent.get(dents) ?? { d: dents, h: config.sizes.map(() => 0), v: config.sizes.map(() => 0) };
    });
  }, [config.table, config.sizes, maxRows]);

  function patch(partial: Partial<HagelExpertConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }));
    setOk(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hagelExpert: config }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Enregistrement impossible");
      return;
    }
    setOk("Paramètres Hagel Expert enregistrés");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {error ? <ErrorText message={error} /> : null}
      {ok ? <p className="text-sm font-medium text-emerald-700">{ok}</p> : null}

      <div className="card space-y-4 p-6">
        <div>
          <h2 className="font-semibold text-navy">Règles de calcul</h2>
          <p className="mt-1 text-sm text-slate-500">
            AW (unités de travail) selon le nombre et la taille des bosses, puis conversion en heures via le teiler.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Teiler (AW / heure)" hint="10er = 10 AW/h, 12er = 12 AW/h">
            <Input
              type="number"
              min={1}
              step="1"
              value={config.wuPerHour}
              disabled={!canEdit}
              onChange={(e) => patch({ wuPerHour: Number(e.target.value) })}
            />
          </Field>
          <Field label="AW de base / panneau">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={config.wuBaseValue}
              disabled={!canEdit}
              onChange={(e) => patch({ wuBaseValue: Number(e.target.value) })}
            />
          </Field>
          <Field label="Finish / panneau (AW)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={config.finishPerPanel}
              disabled={!canEdit}
              onChange={(e) => patch({ finishPerPanel: Number(e.target.value) })}
            />
          </Field>
          <Field label="Rüstzeit véhicule (AW)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={config.preparationWu}
              disabled={!canEdit}
              onChange={(e) => patch({ preparationWu: Number(e.target.value) })}
            />
          </Field>
          <Field label="Finish véhicule (AW)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={config.finishVehicle}
              disabled={!canEdit}
              onChange={(e) => patch({ finishVehicle: Number(e.target.value) })}
            />
          </Field>
          <Field label="Majoration aluminium (%)">
            <Input
              type="number"
              min={0}
              step="1"
              value={config.aluminumPercent}
              disabled={!canEdit}
              onChange={(e) => patch({ aluminumPercent: Number(e.target.value) })}
            />
          </Field>
          <Field label="Majoration collage / traction (%)">
            <Input
              type="number"
              min={0}
              step="1"
              value={config.gluePercent}
              disabled={!canEdit}
              onChange={(e) => patch({ gluePercent: Number(e.target.value) })}
            />
          </Field>
          <Field label="Max bosses horizontales">
            <Input
              type="number"
              min={1}
              value={config.maxDentsHorizontal}
              disabled={!canEdit}
              onChange={(e) => patch({ maxDentsHorizontal: Number(e.target.value) })}
            />
          </Field>
          <Field label="Max bosses verticales">
            <Input
              type="number"
              min={1}
              value={config.maxDentsVertical}
              disabled={!canEdit}
              onChange={(e) => patch({ maxDentsVertical: Number(e.target.value) })}
            />
          </Field>
        </div>
      </div>

      <div className="card space-y-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-navy">Table AW Hagel Expert</h2>
            <p className="text-sm text-slate-500">Valeur de travail selon le nombre de bosses et le diamètre (mm).</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className={`btn ${orientation === "HORIZONTAL" ? "btn-navy" : "btn-ghost"}`}
              onClick={() => setOrientation("HORIZONTAL")}
            >
              Horizontal
            </button>
            <button
              type="button"
              className={`btn ${orientation === "VERTICAL" ? "btn-navy" : "btn-ghost"}`}
              onClick={() => setOrientation("VERTICAL")}
            >
              Vertical
            </button>
            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setConfig(defaultHagelExpertConfig());
                  setOk(null);
                }}
              >
                Réinitialiser
              </Button>
            ) : null}
          </div>
        </div>
        <div className="max-h-[28rem] overflow-auto rounded-lg border border-line">
          <table className="table min-w-[640px] text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white">Bosses</th>
                {config.sizes.map((size) => (
                  <th key={size}>{size} mm</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.d}>
                  <td className="sticky left-0 bg-white font-medium text-navy">{row.d}</td>
                  {config.sizes.map((size, sizeIndex) => {
                    const value = orientation === "VERTICAL" ? row.v[sizeIndex] : row.h[sizeIndex];
                    return (
                      <td key={size}>
                        <Input
                          type="number"
                          min={0}
                          className="table-num"
                          disabled={!canEdit}
                          value={Number(value) || 0}
                          onChange={(e) =>
                            patch({
                              table: setCell(config.table, row.d, sizeIndex, orientation, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit ? (
        <Button type="submit" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
      ) : (
        <p className="text-sm text-slate-500">Lecture seule.</p>
      )}
    </form>
  );
}
