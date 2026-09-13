export type VehicleMailInfo = {
  licensePlate: string;
  brand: string;
  model: string;
  vin?: string | null;
  year?: number | null;
  color?: string | null;
  mileage?: number | null;
};

export function estimateMailSubject(vehicle: VehicleMailInfo) {
  return `Devis ${vehicle.licensePlate} - ${vehicle.brand} - ${vehicle.model}`;
}

export function estimateMailMessage(
  estimateNumber: string,
  vehicle: VehicleMailInfo,
  companyName: string,
) {
  const lines = [
    "Bonjour,",
    "",
    `Veuillez trouver ci-joint le devis ${estimateNumber}.`,
    "",
    "Véhicule :",
    `Immatriculation : ${vehicle.licensePlate}`,
    `Marque : ${vehicle.brand}`,
    `Modèle : ${vehicle.model}`,
  ];
  if (vehicle.vin) lines.push(`VIN : ${vehicle.vin}`);
  if (vehicle.year) lines.push(`Année : ${vehicle.year}`);
  if (vehicle.color) lines.push(`Couleur : ${vehicle.color}`);
  if (vehicle.mileage != null) {
    lines.push(`Kilométrage : ${vehicle.mileage.toLocaleString("fr-FR")} km`);
  }
  lines.push("", "Cordialement,", companyName);
  return lines.join("\n");
}
