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
  content: { x: 118, y: 98, width: 762, height: 455 },
};

export const EXPLODED_PANEL_SHAPES: DiagramPanelShape[] = [
  {
    label: "Capot",
    d: "M 516 128 L 544 131 L 555 136 L 569 167 L 575 214 L 427 214 L 433 168 L 449 134 L 476 129 Z",
    badge: { x: 501, y: 171 },
  },
  {
    label: "Toit",
    d: "M 551 287 L 577 293 L 571 383 L 507 388 L 434 384 L 428 294 L 459 288 Z",
    badge: { x: 502, y: 337 },
  },
  {
    label: "Coffre supérieur",
    d: "M 572 417 L 584 429 L 584 467 L 427 467 L 427 430 L 437 418 Z",
    badge: { x: 505, y: 442 },
  },
  {
    label: "Coffre inférieur",
    d: "M 587 490 L 587 523 L 575 534 L 454 537 L 433 534 L 426 526 L 426 490 Z",
    badge: { x: 506, y: 513 },
  },
  {
    label: "Aile avant gauche",
    d: "M 270 114 L 285 128 L 292 145 L 295 187 L 303 214 L 300 217 L 229 214 L 228 207 L 247 202 L 263 187 L 268 173 L 268 159 L 263 144 L 251 130 L 219 124 L 229 114 Z",
    badge: { x: 261, y: 165 },
  },
  {
    label: "Aile avant droite",
    d: "M 767 114 L 774 117 L 781 128 L 744 130 L 731 147 L 729 165 L 742 192 L 755 201 L 770 204 L 771 210 L 700 214 L 698 209 L 706 181 L 707 150 L 718 123 L 733 114 Z",
    badge: { x: 739, y: 164 },
  },
  {
    label: "Portière avant gauche",
    d: "M 288 231 L 306 238 L 335 282 L 343 308 L 344 341 L 227 339 L 228 231 Z",
    badge: { x: 285, y: 286 },
  },
  {
    label: "Portière avant droite",
    d: "M 748 226 L 771 230 L 773 334 L 659 339 L 658 310 L 662 290 L 694 236 L 713 228 Z",
    badge: { x: 715, y: 282 },
  },
  {
    label: "Portière arrière gauche",
    d: "M 288 352 L 343 359 L 344 377 L 335 412 L 317 444 L 307 449 L 275 451 L 270 448 L 262 432 L 227 429 L 227 352 Z",
    badge: { x: 285, y: 401 },
  },
  {
    label: "Portière arrière droite",
    d: "M 772 350 L 772 426 L 739 428 L 731 443 L 725 446 L 687 443 L 667 410 L 659 384 L 658 356 L 707 350 Z",
    badge: { x: 715, y: 398 },
  },
  {
    label: "Aile arrière gauche",
    d: "M 236 442 L 258 453 L 273 476 L 301 478 L 300 534 L 292 541 L 236 543 L 226 535 L 224 528 L 241 527 L 253 521 L 261 512 L 266 497 L 265 483 L 258 469 L 243 456 L 225 450 L 226 442 Z",
    badge: { x: 262, y: 492 },
  },
  {
    label: "Aile arrière droite",
    d: "M 774 437 L 774 446 L 752 454 L 741 467 L 736 492 L 740 505 L 748 515 L 761 522 L 777 523 L 775 529 L 764 537 L 709 535 L 701 522 L 701 473 L 727 472 L 746 445 L 759 438 Z",
    badge: { x: 739, y: 487 },
  },
  {
    label: "Montant A gauche",
    d: "M 381 245 L 396 323 L 399 402 L 393 440 L 371 432 L 380 398 L 382 349 L 379 317 L 363 252 Z",
    badge: { x: 381, y: 342 },
  },
  {
    label: "Montant A droite",
    d: "M 623 244 L 640 251 L 621 327 L 622 394 L 631 429 L 609 437 L 604 407 L 607 318 L 620 246 Z",
    badge: { x: 622, y: 340 },
  },
  {
    label: "Bas de caisse gauche",
    d: "M 152 223 L 148 420 L 132 413 L 133 242 L 134 228 Z",
    badge: { x: 142, y: 321 },
  },
  {
    label: "Bas de caisse droit",
    d: "M 851 220 L 862 224 L 865 409 L 849 414 L 845 220 Z",
    badge: { x: 855, y: 317 },
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
  "Coffre supérieur",
  "Coffre inférieur",
  "Aile arrière gauche",
  "Aile arrière droite",
  "Pare-chocs arrière",
] as const;

export const EXPLODED_ZONE_LABELS = [
  "Capot",
  "Toit",
  "Coffre supérieur",
  "Coffre inférieur",
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

export function diagramZones(_variant?: CarDiagram): DiagramZone[] {
  return EXPLODED_ZONE_LABELS.map((label) => ({ id: panelZoneId(label), label }));
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
