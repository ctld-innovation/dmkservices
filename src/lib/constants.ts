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
  { value: "PDR", label: "PDR (débosselage sans peinture)" },
  { value: "CONVENTIONAL", label: "Réparation conventionnelle" },
  { value: "PANEL_REPLACEMENT", label: "Remplacement de pièce" },
] as const;

export const SEVERITIES = [
  { value: "LIGHT", label: "Léger" },
  { value: "MEDIUM", label: "Moyen" },
  { value: "HEAVY", label: "Fort" },
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

export const CAR_DIAGRAMS = [
  { value: "exploded", label: "Éclaté (schéma panneaux, sans pare-chocs)" },
  { value: "assembled", label: "Silhouette (vue assemblée)" },
] as const;

export type CarDiagram = (typeof CAR_DIAGRAMS)[number]["value"];

export function resolveCarDiagram(value?: string | null): CarDiagram {
  return value === "assembled" ? "assembled" : "exploded";
}

export const DEFAULT_PANELS = [
  "Toit",
  "Capot",
  "Coffre / hayon",
  "Aile avant gauche",
  "Aile avant droite",
  "Aile arrière gauche",
  "Aile arrière droite",
  "Portière avant gauche",
  "Portière avant droite",
  "Portière arrière gauche",
  "Portière arrière droite",
  "Pare-chocs avant",
  "Pare-chocs arrière",
  "Montant A gauche",
  "Montant A droite",
  "Montant B gauche",
  "Montant B droite",
  "Bas de caisse gauche",
  "Bas de caisse droit",
  "Custode gauche",
  "Custode droite",
];

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
