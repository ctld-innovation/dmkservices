import { EXPLODED_PANEL_SHAPES, panelZoneId } from "./diagram";

export const EXPLODED_PANEL_KINDS = ["DSP", "DAP", "ALU", "REPLACEMENT"] as const;
export type ExplodedPanelKind = (typeof EXPLODED_PANEL_KINDS)[number];

export type ExplodedStyleLine = {
  panel?: string | null;
  repairMethod?: string | null;
  dap?: boolean | null;
  aluminum?: boolean | null;
};

export type ExplodedKindStyle = {
  label: string;
  hex: string;
  fill: string;
  stroke: string;
  rgb: [number, number, number];
  strokeRgb: [number, number, number];
};

export type ExplodedColors = Record<ExplodedPanelKind, string>;

/** Plus l’index est bas, plus le type l’emporte si un panneau a plusieurs lignes. */
const KIND_PRIORITY: ExplodedPanelKind[] = ["REPLACEMENT", "ALU", "DAP", "DSP"];

export const EXPLODED_KIND_LABELS: Record<ExplodedPanelKind, string> = {
  DSP: "DSP : Débosselage sans peinture",
  DAP: "DAP : Débosselage avec peinture",
  ALU: "ALU : Aluminium",
  REPLACEMENT: "Remplacement de pièce",
};

export const DEFAULT_EXPLODED_COLORS: ExplodedColors = {
  DSP: "#00d9f5",
  DAP: "#f97316",
  ALU: "#8b5cf6",
  REPLACEMENT: "#e11d48",
};

const DEFAULT_KIND_STYLES: Record<ExplodedPanelKind, ExplodedKindStyle> = {
  DSP: {
    label: EXPLODED_KIND_LABELS.DSP,
    hex: DEFAULT_EXPLODED_COLORS.DSP,
    fill: "rgba(0, 217, 245, 0.6)",
    stroke: "#0a3d48",
    rgb: [0, 217, 245],
    strokeRgb: [10, 61, 72],
  },
  DAP: {
    label: EXPLODED_KIND_LABELS.DAP,
    hex: DEFAULT_EXPLODED_COLORS.DAP,
    fill: "rgba(249, 115, 22, 0.6)",
    stroke: "#9a3412",
    rgb: [249, 115, 22],
    strokeRgb: [154, 52, 18],
  },
  ALU: {
    label: EXPLODED_KIND_LABELS.ALU,
    hex: DEFAULT_EXPLODED_COLORS.ALU,
    fill: "rgba(139, 92, 246, 0.6)",
    stroke: "#5b21b6",
    rgb: [139, 92, 246],
    strokeRgb: [91, 33, 182],
  },
  REPLACEMENT: {
    label: EXPLODED_KIND_LABELS.REPLACEMENT,
    hex: DEFAULT_EXPLODED_COLORS.REPLACEMENT,
    fill: "rgba(225, 29, 72, 0.55)",
    stroke: "#9f1239",
    rgb: [225, 29, 72],
    strokeRgb: [159, 18, 57],
  },
};

function parseHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const match = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1];
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
  }
  return `#${hex.toLowerCase()}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb: [number, number, number]) {
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function styleFromHex(hex: string, label: string): ExplodedKindStyle {
  const rgb = hexToRgb(hex);
  const strokeRgb: [number, number, number] = [
    Math.round(rgb[0] * 0.42),
    Math.round(rgb[1] * 0.42),
    Math.round(rgb[2] * 0.42),
  ];
  return {
    label,
    hex,
    fill: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.6)`,
    stroke: rgbToHex(strokeRgb),
    rgb,
    strokeRgb,
  };
}

export function parseExplodedColors(raw: unknown): ExplodedColors {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const colors = { ...DEFAULT_EXPLODED_COLORS };
  for (const kind of EXPLODED_PANEL_KINDS) {
    colors[kind] = parseHex(obj[kind]) ?? DEFAULT_EXPLODED_COLORS[kind];
  }
  return colors;
}

export function explodedKindStyles(raw?: unknown): Record<ExplodedPanelKind, ExplodedKindStyle> {
  const colors = parseExplodedColors(raw);
  const styles = { ...DEFAULT_KIND_STYLES };
  for (const kind of EXPLODED_PANEL_KINDS) {
    if (colors[kind] === DEFAULT_EXPLODED_COLORS[kind]) continue;
    styles[kind] = styleFromHex(colors[kind], EXPLODED_KIND_LABELS[kind]);
  }
  return styles;
}

export function explodedKindFromLine(line: ExplodedStyleLine): ExplodedPanelKind | null {
  if (line.repairMethod === "PANEL_REPLACEMENT") return "REPLACEMENT";
  if (line.aluminum) return "ALU";
  if (line.dap) return "DAP";
  if (line.repairMethod === "PDR") return "DSP";
  return null;
}

export function explodedStylesFromLines(lines: ExplodedStyleLine[]): Record<string, ExplodedPanelKind> {
  const map: Record<string, ExplodedPanelKind> = {};
  for (const line of lines) {
    if (!line.panel) continue;
    const kind = explodedKindFromLine(line);
    if (!kind) continue;
    const current = map[line.panel];
    if (!current || KIND_PRIORITY.indexOf(kind) < KIND_PRIORITY.indexOf(current)) {
      map[line.panel] = kind;
    }
  }
  return map;
}

/** Légende limitée aux types réellement colorés sur l’éclaté (pas les pièces hors schéma). */
export function explodedVisibleLegendKinds(
  selected: string[],
  panelStyles: Record<string, ExplodedPanelKind>,
  panelMap: Record<string, string> = {},
): ExplodedPanelKind[] {
  const selectedSet = new Set(selected);
  const used = new Set<ExplodedPanelKind>();
  for (const panel of EXPLODED_PANEL_SHAPES) {
    const piece = panelMap[panelZoneId(panel.label)] ?? panel.label;
    if (!selectedSet.has(piece)) continue;
    const kind = panelStyles[piece];
    if (kind) used.add(kind);
  }
  return EXPLODED_PANEL_KINDS.filter((kind) => used.has(kind));
}
