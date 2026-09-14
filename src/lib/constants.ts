export const CLIENT_TYPES = [
  { value: "WORKSHOP", label: "Atelier / Garage" },
  { value: "INTERMEDIARY", label: "Intermédiaire" },
  { value: "INSURANCE", label: "Compagnie d'assurance" },
  { value: "FINAL_CLIENT", label: "Client final (particulier)" },
] as const;

export const CLIENT_STATUSES = [
  { value: "ACTIVE", label: "Actif" },
  { value: "INACTIVE", label: "Inactif" },
] as const;

export const FUEL_TYPES = [
  { value: "PETROL", label: "Essence" },
  { value: "DIESEL", label: "Diesel" },
  { value: "ELECTRIC", label: "Électrique" },
  { value: "HYBRID", label: "Hybride" },
] as const;

export const ESTIMATE_STATUSES = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "SENT", label: "Envoyé" },
  { value: "APPROVED", label: "Approuvé" },
  { value: "REJECTED", label: "Refusé" },
  { value: "INVOICED", label: "Facturé" },
] as const;

export const DAMAGE_TYPES = [
  { value: "DENT", label: "Bosse" },
  { value: "SCRATCH", label: "Rayure" },
  { value: "CRACK", label: "Fissure" },
  { value: "PAINT_DAMAGE", label: "Dégât peinture" },
] as const;

export const REPAIR_METHODS = [
  { value: "PDR", label: "DSP (débosselage sans peinture)" },
  { value: "CONVENTIONAL", label: "Réparation conventionnelle" },
  { value: "PANEL_REPLACEMENT", label: "Remplacement de pièce" },
] as const;

export const ESTIMATE_REPAIR_METHODS = REPAIR_METHODS.filter((item) => item.value !== "CONVENTIONAL");

export const SEVERITIES = [
  { value: "LIGHT", label: "Léger" },
  { value: "MEDIUM", label: "Moyen" },
  { value: "HEAVY", label: "Fort" },
] as const;

export const DENT_ORIENTATIONS = [
  { value: "HORIZONTAL", label: "Horizontale" },
  { value: "VERTICAL", label: "Verticale" },
] as const;

export const ROLES = [
  { value: "ADMIN", label: "Administrateur" },
  { value: "ESTIMATOR", label: "Estimateur" },
  { value: "VIEWER", label: "Lecteur" },
] as const;

export const VEHICLE_LINK_ROLES = [
  { value: "OWNER", label: "Propriétaire" },
  { value: "INSURANCE", label: "Assurance" },
  { value: "WORKSHOP", label: "Garage" },
  { value: "INTERMEDIARY", label: "Intermédiaire" },
] as const;

export const CAR_DIAGRAMS = [{ value: "exploded", label: "Éclaté véhicule" }] as const;

export type CarDiagram = "exploded" | "assembled";

export function resolveCarDiagram(_value?: string | null): CarDiagram {
  return "exploded";
}

/**
 * Centre (capot, pavillon, hayons) puis gauche puis droite.
 * Les montants / custodes / pare-chocs restent collés à leur zone.
 */
export const DEFAULT_PANELS = [
  "Capot",
  "Toit",
  "Coffre supérieur",
  "Coffre inférieur",
  "Pare-chocs avant",
  "Aile avant gauche",
  "Montant A gauche",
  "Portière avant gauche",
  "Portière arrière gauche",
  "Bas de caisse gauche",
  "Montant B gauche",
  "Custode gauche",
  "Aile arrière gauche",
  "Aile avant droite",
  "Montant A droite",
  "Portière avant droite",
  "Portière arrière droite",
  "Bas de caisse droit",
  "Montant B droite",
  "Custode droite",
  "Aile arrière droite",
  "Pare-chocs arrière",
];

export function foldPanelName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/portiere/g, "porte")
    .replace(/\bpavillon\b/g, "toit")
    .replace(/\bhayon superieur\b/g, "coffre superieur")
    .replace(/\bhayon inferieur\b/g, "coffre inferieur")
    .replace(/\bdroite\b/g, "droit")
    .replace(/\bmontant gauche\b/g, "montant a gauche")
    .replace(/\bmontant droit\b/g, "montant a droit")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PANEL_SORT_KEYS = DEFAULT_PANELS.map(foldPanelName);

export function catalogPanelName(panel: string): string | null {
  if (!panel) return null;
  if (DEFAULT_PANELS.includes(panel)) return panel;
  const idx = PANEL_SORT_KEYS.indexOf(foldPanelName(panel));
  return idx >= 0 ? DEFAULT_PANELS[idx] : null;
}

export function isMontantPanel(panel: string) {
  return /(^|\s)montant(\s|$)/i.test(foldPanelName(panel));
}

export function panelSortIndex(panel: string) {
  if (!panel) return DEFAULT_PANELS.length + 1;
  const mapped = catalogPanelName(panel);
  if (mapped) return DEFAULT_PANELS.indexOf(mapped);
  return DEFAULT_PANELS.length;
}

export function sortByPanelOrder<T extends { panel: string }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const pa = panelSortIndex(a.item.panel);
      const pb = panelSortIndex(b.item.panel);
      if (pa !== pb) return pa - pb;
      if (pa === DEFAULT_PANELS.length) {
        return a.item.panel.localeCompare(b.item.panel, "fr") || a.index - b.index;
      }
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "badge-slate",
  SENT: "badge-blue",
  APPROVED: "badge-green",
  REJECTED: "badge-red",
  INVOICED: "badge-amber",
  ACTIVE: "badge-green",
  INACTIVE: "badge-slate",
};

export function labelOf(
  list: readonly { value: string; label: string }[],
  value?: string | null,
) {
  return list.find((item) => item.value === value)?.label ?? value ?? "—";
}
