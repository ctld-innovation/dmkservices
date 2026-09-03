import type { CarDiagram } from "@/lib/constants";

export type DiagramZone = { id: string; label: string };
export type DiagramMaps = Record<CarDiagram, Record<string, string>>;

export type DiagramPanelShape = {
  label: string;
  d: string;
  badge: { x: number; y: number };
};

export const EXPLODED_VIEW = {
  width: 1024,
  height: 622,
  image: "/branding/eclate-vehicule.png",
  /** Zone utile (sans les marges blanches) pour le PDF pleine largeur. */
  content: { x: 118, y: 98, width: 762, height: 432 },
};

export const EXPLODED_PANEL_SHAPES: DiagramPanelShape[] = [
  {
    label: "Capot",
    d: "M 483 129 L 552 134 L 568 166 L 574 213 L 537 197 L 475 194 L 440 205 L 428 214 L 431 177 L 445 140 L 452 133 Z",
    badge: { x: 501, y: 167 },
  },
  {
    label: "Toit",
    d: "M 504 296 L 561 301 L 557 373 L 514 378 L 446 375 L 441 302 Z",
    badge: { x: 501, y: 337 },
  },
  {
    label: "Coffre / hayon",
    d: "M 561 465 L 557 482 L 538 486 L 446 484 L 439 467 Z",
    badge: { x: 501, y: 475 },
  },
  {
    label: "Aile avant gauche",
    d: "M 261 118 L 275 118 L 290 139 L 300 216 L 228 213 L 229 207 L 254 198 L 266 182 L 268 158 L 260 142 Z",
    badge: { x: 275, y: 175 },
  },
  {
    label: "Aile avant droite",
    d: "M 727 116 L 738 117 L 739 138 L 731 159 L 736 185 L 751 200 L 770 205 L 769 211 L 698 211 L 711 137 Z",
    badge: { x: 725, y: 174 },
  },
  {
    label: "Portière avant gauche",
    d: "M 229 231 L 287 231 L 305 237 L 338 289 L 344 340 L 227 338 Z",
    badge: { x: 269, y: 286 },
  },
  {
    label: "Portière avant droite",
    d: "M 732 227 L 771 230 L 772 334 L 701 332 L 658 338 L 664 286 L 691 242 L 709 229 Z",
    badge: { x: 731, y: 282 },
  },
  {
    label: "Portière arrière gauche",
    d: "M 227 353 L 288 353 L 343 360 L 336 407 L 314 446 L 275 450 L 259 429 L 227 428 Z",
    badge: { x: 272, y: 397 },
  },
  {
    label: "Portière arrière droite",
    d: "M 711 349 L 771 350 L 771 426 L 740 427 L 724 446 L 684 440 L 662 393 L 658 357 Z",
    badge: { x: 727, y: 393 },
  },
  {
    label: "Aile arrière gauche",
    d: "M 227 442 L 253 450 L 278 480 L 300 478 L 299 515 L 263 504 L 264 483 L 258 469 L 245 456 L 226 451 Z",
    badge: { x: 272, y: 483 },
  },
  {
    label: "Aile arrière droite",
    d: "M 771 437 L 773 446 L 755 451 L 743 463 L 736 482 L 738 499 L 715 511 L 702 511 L 701 474 L 727 473 L 747 445 Z",
    badge: { x: 728, y: 479 },
  },
  {
    label: "Montant A gauche",
    d: "M 379 246 L 396 324 L 398 404 L 393 439 L 371 431 L 379 408 L 382 345 L 363 252 Z",
    badge: { x: 385, y: 344 },
  },
  {
    label: "Montant A droite",
    d: "M 621 245 L 639 250 L 621 324 L 622 399 L 631 429 L 610 437 L 605 415 L 606 336 Z",
    badge: { x: 618, y: 342 },
  },
  {
    label: "Bas de caisse gauche",
    d: "M 151 223 L 147 419 L 133 414 L 133 280 L 134 229 L 150 224 Z",
    badge: { x: 142, y: 320 },
  },
  {
    label: "Bas de caisse droit",
    d: "M 846 220 L 862 225 L 863 246 L 864 409 L 850 414 L 845 221 Z",
    badge: { x: 855, y: 315 },
  },
];


export const ASSEMBLED_ZONE_LABELS = [
  "Pare-chocs avant",
  "Capot",
  "Aile avant gauche",
  "Aile avant droite",
  "Montant A gauche",
  "Montant A droite",
  "Toit",
  "Portière avant gauche",
  "Portière avant droite",
  "Montant B gauche",
  "Montant B droite",
  "Portière arrière gauche",
  "Portière arrière droite",
  "Bas de caisse gauche",
  "Bas de caisse droit",
  "Custode gauche",
  "Custode droite",
  "Coffre / hayon",
  "Aile arrière gauche",
  "Aile arrière droite",
  "Pare-chocs arrière",
] as const;

export const EXPLODED_ZONE_LABELS = [
  "Capot",
  "Toit",
  "Coffre / hayon",
  "Aile avant gauche",
  "Aile avant droite",
  "Portière avant gauche",
  "Portière avant droite",
  "Portière arrière gauche",
  "Portière arrière droite",
  "Aile arrière gauche",
  "Aile arrière droite",
  "Montant A gauche",
  "Montant A droite",
  "Bas de caisse gauche",
  "Bas de caisse droit",
] as const;

export function panelZoneId(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function diagramZones(variant: CarDiagram): DiagramZone[] {
  const labels = variant === "exploded" ? EXPLODED_ZONE_LABELS : ASSEMBLED_ZONE_LABELS;
  return labels.map((label) => ({ id: panelZoneId(label), label }));
}

export function emptyDiagramMaps(): DiagramMaps {
  return { assembled: {}, exploded: {} };
}

export function parseDiagramMaps(value: unknown): DiagramMaps {
  const maps = emptyDiagramMaps();
  if (!value || typeof value !== "object") return maps;
  const raw = value as Record<string, unknown>;
  for (const key of ["assembled", "exploded"] as const) {
    const entry = raw[key];
    if (entry && typeof entry === "object") {
      maps[key] = Object.fromEntries(
        Object.entries(entry as Record<string, unknown>).filter(
          (item): item is [string, string] => typeof item[1] === "string",
        ),
      );
    }
  }
  return maps;
}

export function resolveDiagramPanelMap(
  maps: unknown,
  variant: CarDiagram,
  lookups: Array<{ id: string; label: string }>,
): Record<string, string> {
  const stored = parseDiagramMaps(maps)[variant];
  const byId = Object.fromEntries(lookups.map((item) => [item.id, item.label]));
  const byLabel = Object.fromEntries(lookups.map((item) => [item.label, item.label]));
  const result: Record<string, string> = {};
  for (const zone of diagramZones(variant)) {
    const lookupId = stored[zone.id];
    result[zone.id] = (lookupId && byId[lookupId]) || byLabel[zone.label] || zone.label;
  }
  return result;
}
