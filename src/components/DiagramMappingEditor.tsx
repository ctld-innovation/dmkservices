"use client";

import { useMemo, useState } from "react";
import type { CarDiagram } from "@/lib/constants";
import { CAR_DIAGRAMS } from "@/lib/constants";
import { diagramZones, parseDiagramMaps, type DiagramMaps } from "@/lib/diagram";
import { Button, Field, Select } from "@/components/ui";
import { CarDiagramPreview, CarDiagramSvg } from "@/components/CarPanelPicker";

type Piece = { id: string; label: string };

export function DiagramMappingEditor({
  initialDiagram,
  initialMaps,
  pieces,
  isAdmin,
  onSave,
}: {
  initialDiagram: CarDiagram;
  initialMaps: unknown;
  pieces: Piece[];
  isAdmin: boolean;
  onSave: (carDiagram: CarDiagram, maps: DiagramMaps) => Promise<void>;
}) {
  const [diagram, setDiagram] = useState<CarDiagram>(initialDiagram);
  const [maps, setMaps] = useState<DiagramMaps>(() => parseDiagramMaps(initialMaps));
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const zones = useMemo(() => diagramZones(diagram), [diagram]);
  const activeZone = zones.find((zone) => zone.id === activeZoneId) ?? null;
  const assignedId = activeZone ? maps[diagram][activeZone.id] ?? "" : "";

  function assignPiece(lookupId: string) {
    if (!activeZone) return;
    setMaps((prev) => {
      const next = { ...prev[diagram] };
      if (!lookupId) delete next[activeZone.id];
      else next[activeZone.id] = lookupId;
      return { ...prev, [diagram]: next };
    });
    setOk(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await onSave(diagram, maps);
      setOk("Éclaté et liaisons enregistrés");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h3 className="mb-1 font-semibold text-navy">Éclaté véhicule</h3>
      <p className="mb-4 text-sm text-slate-500">
        Choisissez le schéma utilisé sur les devis, puis cliquez un panneau pour le lier à une pièce de la liste.
      </p>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {CAR_DIAGRAMS.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer flex-col gap-2 rounded-xl border border-line p-3 has-[:checked]:border-amber has-[:checked]:ring-2 has-[:checked]:ring-amber/40"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-navy">
              <input
                type="radio"
                name="carDiagramChoice"
                value={opt.value}
                checked={diagram === opt.value}
                onChange={() => {
                  setDiagram(opt.value);
                  setActiveZoneId(null);
                }}
              />
              {opt.label}
            </span>
            <CarDiagramPreview variant={opt.value} />
          </label>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-xl border border-line bg-gradient-to-b from-white to-mist p-2">
          <CarDiagramSvg
            variant={diagram}
            selected={[]}
            dentCounts={{}}
            activeZoneId={activeZoneId}
            onSelectZone={setActiveZoneId}
          />
        </div>
        <div className="space-y-3">
          <Field label="Panneau du schéma">
            <Select
              value={activeZoneId ?? ""}
              onChange={(e) => setActiveZoneId(e.target.value || null)}
            >
              <option value="">Cliquez un panneau…</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                  {maps[diagram][zone.id]
                    ? ` → ${pieces.find((p) => p.id === maps[diagram][zone.id])?.label ?? "pièce"}`
                    : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pièce liée">
            <Select
              value={assignedId}
              disabled={!activeZone || !isAdmin}
              onChange={(e) => assignPiece(e.target.value)}
            >
              <option value="">{activeZone ? `Par défaut : ${activeZone.label}` : "—"}</option>
              {pieces.map((piece) => (
                <option key={piece.id} value={piece.id}>
                  {piece.label}
                </option>
              ))}
            </Select>
          </Field>
          <ul className="max-h-64 space-y-1 overflow-auto text-sm">
            {zones.map((zone) => {
              const piece = pieces.find((p) => p.id === maps[diagram][zone.id]);
              return (
                <li key={zone.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left ${
                      activeZoneId === zone.id ? "bg-amber/20 font-medium text-navy" : "hover:bg-mist"
                    }`}
                    onClick={() => setActiveZoneId(zone.id)}
                  >
                    <span>{zone.label}</span>
                    <span className={piece ? "text-navy" : "text-slate-400"}>
                      {piece ? piece.label : zone.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {ok ? <p className="mt-3 text-sm text-green-700">{ok}</p> : null}
      <div className="mt-4">
        <Button type="button" onClick={() => void save()} disabled={!isAdmin || saving}>
          {isAdmin ? (saving ? "Enregistrement…" : "Enregistrer l'éclaté") : "Réservé à l'administrateur"}
        </Button>
      </div>
    </div>
  );
}
