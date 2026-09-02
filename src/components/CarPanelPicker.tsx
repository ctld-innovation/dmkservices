"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type PanelShape = {
  label: string;
  d: string;
  badge: { x: number; y: number };
};

/**
 * Vue de dessus d'une berline (avant en haut).
 * Les panneaux s'emboîtent pour former une silhouette de voiture.
 * Les labels doivent matcher DEFAULT_PANELS.
 */
const PANELS: PanelShape[] = [
  {
    label: "Pare-chocs avant",
    d: "M 86 10 C 116 3 144 3 174 10 L 186 28 L 74 28 Z",
    badge: { x: 130, y: 18 },
  },
  {
    label: "Capot",
    d: "M 90 31 L 170 31 L 182 114 L 78 114 Z",
    badge: { x: 130, y: 70 },
  },
  {
    label: "Aile avant gauche",
    d: "M 54 32 L 86 32 L 74 114 L 70 156 L 52 156 C 44 140 40 128 40 112 C 40 88 46 48 54 32 Z",
    badge: { x: 58, y: 88 },
  },
  {
    label: "Aile avant droite",
    d: "M 174 32 L 206 32 C 214 48 220 88 220 112 C 220 128 216 140 208 156 L 190 156 L 186 114 Z",
    badge: { x: 202, y: 88 },
  },
  {
    label: "Montant A gauche",
    d: "M 72 116 L 86 116 L 98 154 L 80 154 Z",
    badge: { x: 84, y: 136 },
  },
  {
    label: "Montant A droite",
    d: "M 174 116 L 188 116 L 180 154 L 162 154 Z",
    badge: { x: 176, y: 136 },
  },
  {
    label: "Toit",
    d: "M 92 158 C 110 154 150 154 168 158 L 168 286 C 150 290 110 290 92 286 Z",
    badge: { x: 130, y: 222 },
  },
  {
    label: "Portière avant gauche",
    d: "M 52 158 L 88 158 L 88 226 L 50 226 C 46 196 48 170 52 158 Z",
    badge: { x: 68, y: 192 },
  },
  {
    label: "Portière avant droite",
    d: "M 172 158 L 208 158 C 212 170 214 196 210 226 L 172 226 Z",
    badge: { x: 192, y: 192 },
  },
  {
    label: "Montant B gauche",
    d: "M 78 228 L 90 228 L 90 244 L 76 244 Z",
    badge: { x: 83, y: 236 },
  },
  {
    label: "Montant B droite",
    d: "M 170 228 L 182 228 L 184 244 L 170 244 Z",
    badge: { x: 177, y: 236 },
  },
  {
    label: "Portière arrière gauche",
    d: "M 50 246 L 88 246 L 88 312 L 52 312 C 46 284 46 258 50 246 Z",
    badge: { x: 68, y: 279 },
  },
  {
    label: "Portière arrière droite",
    d: "M 172 246 L 210 246 C 214 258 214 284 208 312 L 172 312 Z",
    badge: { x: 192, y: 279 },
  },
  {
    label: "Bas de caisse gauche",
    d: "M 40 160 L 50 160 L 52 312 L 40 312 Z",
    badge: { x: 45, y: 236 },
  },
  {
    label: "Bas de caisse droit",
    d: "M 210 160 L 220 160 L 220 312 L 208 312 Z",
    badge: { x: 215, y: 236 },
  },
  {
    label: "Custode gauche",
    d: "M 52 314 L 88 314 L 88 368 L 54 368 C 48 348 48 324 52 314 Z",
    badge: { x: 68, y: 340 },
  },
  {
    label: "Custode droite",
    d: "M 172 314 L 208 314 C 212 324 212 348 206 368 L 172 368 Z",
    badge: { x: 192, y: 340 },
  },
  {
    label: "Coffre / hayon",
    d: "M 90 344 L 170 344 L 162 410 L 98 410 Z",
    badge: { x: 130, y: 376 },
  },
  {
    label: "Aile arrière gauche",
    d: "M 52 370 L 88 370 L 86 410 L 56 410 C 46 400 44 384 52 370 Z",
    badge: { x: 68, y: 390 },
  },
  {
    label: "Aile arrière droite",
    d: "M 172 370 L 208 370 C 216 384 214 400 204 410 L 174 410 Z",
    badge: { x: 192, y: 390 },
  },
  {
    label: "Pare-chocs arrière",
    d: "M 78 412 L 182 412 L 172 436 C 130 446 130 446 88 436 Z",
    badge: { x: 130, y: 424 },
  },
];

function Wheel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g className="pointer-events-none">
      <ellipse cx={cx} cy={cy} rx="17" ry="22" className="fill-navy/85" />
      <ellipse cx={cx} cy={cy} rx="9" ry="12" className="fill-white/35" />
      <ellipse cx={cx} cy={cy} rx="3.5" ry="5" className="fill-navy/45" />
    </g>
  );
}

export function CarPanelPicker({
  selected,
  dentCounts,
  onToggle,
}: {
  selected: string[];
  dentCounts: Record<string, number>;
  onToggle: (panel: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const selectedSet = new Set(selected);

  return (
    <div className="card p-4">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold text-navy">Éclaté véhicule</h2>
          <p className="text-xs text-slate-500">Cliquez les panneaux bosselés — recliquer pour retirer.</p>
        </div>
        <div className="text-xs font-medium text-navy">
          {selected.length} panneau{selected.length > 1 ? "x" : ""}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
        <div className="w-full max-w-[200px] shrink-0 rounded-xl border border-line bg-gradient-to-b from-white to-mist px-1 py-1">
          <svg
            viewBox="0 0 260 452"
            className="mx-auto h-auto w-full select-none"
            role="img"
            aria-label="Vue de dessus d'une voiture, panneaux cliquables"
          >
            <title>Carrosserie vue de dessus</title>
            <Wheel cx={48} cy={118} />
            <Wheel cx={212} cy={118} />
            <Wheel cx={48} cy={388} />
            <Wheel cx={212} cy={388} />

            <path
              d="M 88 116 L 172 116 L 160 154 L 100 154 Z"
              className="pointer-events-none fill-[#b8eaf5] stroke-navy/20"
              strokeWidth="1"
            />
            <path
              d="M 94 288 L 166 288 L 168 340 L 92 340 Z"
              className="pointer-events-none fill-[#b8eaf5] stroke-navy/20"
              strokeWidth="1"
            />

            {PANELS.map((panel) => {
              const isOn = selectedSet.has(panel.label);
              const isHover = hovered === panel.label;
              const dents = dentCounts[panel.label] ?? 0;
              return (
                <g
                  key={panel.label}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isOn}
                  aria-label={panel.label}
                  className="outline-none"
                  onMouseEnter={() => setHovered(panel.label)}
                  onMouseLeave={() => setHovered((h) => (h === panel.label ? null : h))}
                  onClick={() => onToggle(panel.label)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggle(panel.label);
                    }
                  }}
                >
                  <path
                    d={panel.d}
                    className={cn(
                      "stroke-[1.15] transition duration-150",
                      isOn
                        ? "fill-amber stroke-navy"
                        : isHover
                          ? "fill-white stroke-amber"
                          : "fill-white stroke-navy/50",
                    )}
                    style={{
                      cursor: "pointer",
                      filter: isOn ? "drop-shadow(0 0 4px rgb(0 217 245 / 50%))" : undefined,
                    }}
                  />
                  {isOn && dents > 0 ? (
                    <g className="pointer-events-none">
                      <circle cx={panel.badge.x} cy={panel.badge.y} r="7.5" className="fill-navy" />
                      <text
                        x={panel.badge.x}
                        y={panel.badge.y + 3}
                        textAnchor="middle"
                        className="fill-white"
                        style={{ fontSize: 8, fontWeight: 700 }}
                      >
                        {dents}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}

            <ellipse cx="34" cy="164" rx="7" ry="4.5" className="pointer-events-none fill-white stroke-navy/40" />
            <ellipse cx="226" cy="164" rx="7" ry="4.5" className="pointer-events-none fill-white stroke-navy/40" />
            <ellipse cx="92" cy="18" rx="7" ry="3.5" className="pointer-events-none fill-amber/55" />
            <ellipse cx="168" cy="18" rx="7" ry="3.5" className="pointer-events-none fill-amber/55" />
            <path d="M 130 36 L 130 110" className="pointer-events-none stroke-navy/15" strokeWidth="1" />
            <rect x="96" y="416" width="13" height="5" rx="2" className="pointer-events-none fill-red-400/80" />
            <rect x="151" y="416" width="13" height="5" rx="2" className="pointer-events-none fill-red-400/80" />
            <text
              x="130"
              y="8"
              textAnchor="middle"
              className="pointer-events-none fill-navy/40"
              style={{ fontSize: 7, fontWeight: 700 }}
            >
              AVANT
            </text>
            <text
              x="130"
              y="448"
              textAnchor="middle"
              className="pointer-events-none fill-navy/40"
              style={{ fontSize: 7, fontWeight: 700 }}
            >
              ARRIÈRE
            </text>
          </svg>
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
                    title="Retirer"
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
