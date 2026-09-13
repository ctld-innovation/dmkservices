"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CarDiagram } from "@/lib/constants";
import { panelZoneId, EXPLODED_PANEL_SHAPES, EXPLODED_VIEW } from "@/lib/diagram";

type PanelShape = {
  id: string;
  label: string;
  d: string;
  badge: { x: number; y: number };
};

type PanelDraft = Omit<PanelShape, "id">;

function withZoneIds(panels: PanelDraft[]): PanelShape[] {
  return panels.map((panel) => ({ ...panel, id: panelZoneId(panel.label) }));
}

const EXPLODED_LAYOUT = {
  viewBox: "0 0 1024 622",
  panels: withZoneIds(EXPLODED_PANEL_SHAPES),
  image: EXPLODED_VIEW.image,
  badgeRadius: 22,
  badgeFont: 18,
};

export function CarDiagramSvg({
  selected,
  dentCounts,
  interactive = true,
  hovered,
  onHover,
  onToggle,
  panelMap,
  activeZoneId,
  onSelectZone,
  cropContent = false,
}: {
  variant?: CarDiagram;
  selected: string[];
  dentCounts: Record<string, number>;
  interactive?: boolean;
  hovered?: string | null;
  onHover?: (label: string | null) => void;
  onToggle?: (panel: string) => void;
  panelMap?: Record<string, string>;
  activeZoneId?: string | null;
  onSelectZone?: (zoneId: string) => void;
  cropContent?: boolean;
}) {
  const layout = EXPLODED_LAYOUT;
  const [localHover, setLocalHover] = useState<string | null>(null);
  const selectedSet = new Set(selected);
  const mapping = onSelectZone != null;
  const pieceOf = (panel: PanelShape) => panelMap?.[panel.id] ?? panel.label;
  const badgeR = layout.badgeRadius;
  const badgeFont = layout.badgeFont;
  const activeHover = hovered ?? localHover;
  const viewBox = cropContent
    ? `${EXPLODED_VIEW.content.x} ${EXPLODED_VIEW.content.y} ${EXPLODED_VIEW.content.width} ${EXPLODED_VIEW.content.height}`
    : layout.viewBox;

  const badges = mapping
    ? []
    : layout.panels.flatMap((panel) => {
        const piece = pieceOf(panel);
        const isOn = selectedSet.has(piece);
        const dents = dentCounts[piece] ?? 0;
        if (!isOn || dents <= 0) return [];
        return [{ ...panel, dents }];
      });

  return (
    <svg
      viewBox={viewBox}
      className="mx-auto h-auto w-full select-none"
      role="img"
      aria-label="Éclaté de carrosserie, panneaux écartés"
    >
      <image href={layout.image} width="1024" height="622" className="pointer-events-none" />
      {layout.panels.map((panel) => {
        const piece = pieceOf(panel);
        const isOn = mapping ? activeZoneId === panel.id : selectedSet.has(piece);
        const isHover = activeHover === piece || activeHover === panel.id;
        const activate = () => {
          if (mapping) onSelectZone?.(panel.id);
          else onToggle?.(piece);
        };
        const setHover = (value: string | null) => {
          setLocalHover(value);
          onHover?.(value);
        };
        return (
          <g
            key={panel.id}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? isOn : undefined}
            aria-label={piece}
            className="outline-none"
            onMouseEnter={interactive ? () => setHover(mapping ? panel.id : piece) : undefined}
            onMouseLeave={interactive ? () => setHover(null) : undefined}
            onClick={interactive ? activate : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      activate();
                    }
                  }
                : undefined
            }
          >
            <title>{piece}</title>
            <path
              d={panel.d}
              className={cn(
                "transition duration-150",
                layout.image
                  ? isOn
                    ? "fill-amber/60 stroke-navy"
                    : isHover
                      ? "fill-amber/25 stroke-amber"
                      : "fill-transparent stroke-transparent"
                  : isOn
                    ? "fill-amber stroke-navy"
                    : isHover
                      ? "fill-white stroke-amber"
                      : "fill-white stroke-navy/50",
                "stroke-2",
              )}
              style={{
                cursor: interactive ? "pointer" : "default",
                filter: isOn ? "drop-shadow(0 0 4px rgb(0 217 245 / 50%))" : undefined,
              }}
            />
          </g>
        );
      })}
      {badges.map((panel) => (
        <g key={`badge-${panel.id}`} className="pointer-events-none">
          <circle cx={panel.badge.x} cy={panel.badge.y} r={badgeR} className="fill-navy" />
          <text
            x={panel.badge.x}
            y={panel.badge.y + badgeFont * 0.38}
            textAnchor="middle"
            className="fill-white"
            style={{ fontSize: badgeFont, fontWeight: 700 }}
          >
            {panel.dents}
          </text>
        </g>
      ))}
      {activeHover
        ? (() => {
            const panel = layout.panels.find((p) => p.id === activeHover || pieceOf(p) === activeHover);
            if (!panel) return null;
            const name = pieceOf(panel);
            const font = Math.max(badgeFont, 14);
            const padX = font * 0.55;
            const width = Math.max(name.length * font * 0.62 + padX * 2, 48);
            const height = font * 1.75;
            const x = panel.badge.x;
            const y = panel.badge.y - badgeR - 6;
            return (
              <g className="pointer-events-none" transform={`translate(${x} ${y})`}>
                <rect
                  x={-width / 2}
                  y={-height}
                  width={width}
                  height={height}
                  rx={font * 0.35}
                  className="fill-navy"
                />
                <text
                  y={-height / 2 + font * 0.38}
                  textAnchor="middle"
                  className="fill-white"
                  style={{ fontSize: font, fontWeight: 700 }}
                >
                  {name}
                </text>
              </g>
            );
          })()
        : null}
    </svg>
  );
}

export function CarDiagramPreview() {
  return (
    <div className="rounded-xl border border-line bg-gradient-to-b from-white to-mist px-1 py-1">
      <CarDiagramSvg selected={[]} dentCounts={{}} interactive={false} />
    </div>
  );
}

export function CarPanelPicker({
  selected,
  dentCounts,
  onToggle,
  panelMap,
  compact,
}: {
  selected: string[];
  dentCounts: Record<string, number>;
  onToggle: (panel: string) => void;
  variant?: CarDiagram;
  panelMap?: Record<string, string>;
  compact?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const totalDents = Object.values(dentCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className={compact ? "" : "card p-4"}>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold text-navy">Éclaté véhicule</h2>
          <p className="text-xs text-slate-500">Cliquez un panneau pour renseigner les bosses, puis validez pour mettre à jour le tableau.</p>
        </div>
        <div className="text-xs font-medium text-navy">
          {selected.length} panneau{selected.length > 1 ? "x" : ""}
          {totalDents ? ` · ${totalDents} bosse${totalDents > 1 ? "s" : ""}` : ""}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
        <div className="w-full max-w-[460px] shrink-0 rounded-xl border border-line bg-gradient-to-b from-white to-mist px-1 py-1">
          <CarDiagramSvg
            selected={selected}
            dentCounts={dentCounts}
            panelMap={panelMap}
            hovered={hovered}
            onHover={setHovered}
            onToggle={onToggle}
          />
        </div>

        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium text-navy">{hovered ?? "Survolez un panneau"}</p>
          {selected.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {selected.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => onToggle(name)}
                    className="badge badge-amber cursor-pointer"
                    title="Ouvrir"
                  >
                    {name}
                    {dentCounts[name] ? ` · ${dentCounts[name]}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-slate-500">Aucun panneau sélectionné.</p>
          )}
        </div>
      </div>
    </div>
  );
}
