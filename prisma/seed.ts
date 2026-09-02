import { PrismaClient, type ClientType, type EstimateStatus, type FuelType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PANELS = [
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

async function main() {
  await prisma.estimateLineItem.deleteMany();
  await prisma.estimateStatusLog.deleteMany();
  await prisma.estimate.deleteMany();
  await prisma.vehiclePhoto.deleteMany();
  await prisma.clientVehicle.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.client.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.lookupValue.deleteMany();
  await prisma.user.deleteMany();
  await prisma.companySettings.deleteMany();

  const [adminHash, estHash, viewHash] = await Promise.all([
    bcrypt.hash("Admin1234!", 10),
    bcrypt.hash("Estimator1234!", 10),
    bcrypt.hash("Viewer1234!", 10),
  ]);

  const admin = await prisma.user.create({
    data: {
      email: "admin@dmkservices.fr",
      passwordHash: adminHash,
      firstName: "Thierry",
      lastName: "Martin",
      role: "ADMIN",
    },
  });
  const estimator = await prisma.user.create({
    data: {
      email: "estimator@dmkservices.fr",
      passwordHash: estHash,
      firstName: "Camille",
      lastName: "Moreau",
      role: "ESTIMATOR",
    },
  });
  await prisma.user.create({
    data: {
      email: "viewer@dmkservices.fr",
      passwordHash: viewHash,
      firstName: "Léa",
      lastName: "Bernard",
      role: "VIEWER",
    },
  });

  await prisma.companySettings.create({
    data: {
      id: "default",
      name: "DMK Services",
      logoPath: "/branding/logo.png",
      street: "12 rue des Artisans",
      city: "Lyon",
      postalCode: "69003",
      country: "France",
      phone: "04 78 00 00 00",
      email: "contact@dmkservices.fr",
      taxId: "FR12345678901",
      defaultLaborRate: 78,
      defaultTaxRate: 20,
      estimatePrefix: "EST",
      estimateSeqPad: 4,
      lastEstimateYear: 2026,
      lastEstimateSeq: 4,
      termsAndConditions:
        "Devis valable 30 jours. Paiement à 30 jours fin de mois. PDR réalisé selon l'état de la tôle et l'accessibilité. Toute pièce remplacée reste propriété du client. TVA applicable selon la réglementation en vigueur.",
    },
  });

  await prisma.lookupValue.createMany({
    data: PANELS.map((label, i) => ({
      category: "PANEL",
      label,
      value: label,
      sortOrder: i,
    })),
  });

  const clientsData: Array<{
    type: ClientType;
    companyName?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    mobile: string;
    street: string;
    city: string;
    postalCode: string;
    taxId?: string;
  }> = [
    {
      type: "WORKSHOP",
      companyName: "Garage Dupont",
      firstName: "Jean",
      lastName: "Dupont",
      email: "contact@garage-dupont.fr",
      phone: "04 72 11 22 33",
      mobile: "06 11 22 33 44",
      street: "8 avenue Jean Jaurès",
      city: "Villeurbanne",
      postalCode: "69100",
      taxId: "FR334455667",
    },
    {
      type: "INTERMEDIARY",
      companyName: "Courtage Auto Plus",
      firstName: "Sophie",
      lastName: "Lemoine",
      email: "s.lemoine@courtage-auto.fr",
      phone: "04 78 55 66 77",
      mobile: "06 98 76 54 32",
      street: "25 rue de la République",
      city: "Lyon",
      postalCode: "69002",
      taxId: "FR998877665",
    },
    {
      type: "INSURANCE",
      companyName: "AXA France",
      firstName: "Paul",
      lastName: "Girard",
      email: "paul.girard@axa.fr",
      phone: "01 40 00 00 00",
      mobile: "06 12 34 56 78",
      street: "313 Terrasses de l'Arche",
      city: "Nanterre",
      postalCode: "92727",
      taxId: "FR123AXA0001",
    },
    {
      type: "FINAL_CLIENT",
      firstName: "Marie",
      lastName: "Lefèvre",
      email: "marie.lefevre@email.fr",
      phone: "",
      mobile: "07 45 12 89 00",
      street: "14 chemin des Vignes",
      city: "Caluire-et-Cuire",
      postalCode: "69300",
    },
    {
      type: "FINAL_CLIENT",
      firstName: "Antoine",
      lastName: "Rousseau",
      email: "a.rousseau@email.fr",
      phone: "04 78 22 11 00",
      mobile: "06 77 88 99 00",
      street: "3 place Bellecour",
      city: "Lyon",
      postalCode: "69002",
    },
    {
      type: "WORKSHOP",
      companyName: "Carrosserie des Alpes",
      firstName: "Nadia",
      lastName: "Benali",
      email: "atelier@carrosserie-alpes.fr",
      phone: "04 76 00 11 22",
      mobile: "06 20 30 40 50",
      street: "42 route de Grenoble",
      city: "Bron",
      postalCode: "69500",
      taxId: "FR556677889",
    },
  ];

  const clients: Awaited<ReturnType<typeof prisma.client.create>>[] = [];
  for (const data of clientsData) {
    clients.push(
      await prisma.client.create({
        data: { ...data, country: "France", createdById: admin.id, updatedById: admin.id },
      }),
    );
  }

  const vehiclesSpec: Array<{
    licensePlate: string;
    vin: string;
    brand: string;
    model: string;
    year: number;
    color: string;
    mileage: number;
    fuelType: FuelType;
    clientIndexes: number[];
  }> = [
    {
      licensePlate: "AB-123-CD",
      vin: "VF3XXXXXXXXXXXXX1",
      brand: "Peugeot",
      model: "308",
      year: 2021,
      color: "Gris Artense",
      mileage: 45200,
      fuelType: "PETROL",
      clientIndexes: [0, 2],
    },
    {
      licensePlate: "EF-456-GH",
      vin: "VF1XXXXXXXXXXXXX2",
      brand: "Renault",
      model: "Clio V",
      year: 2022,
      color: "Blanc Glacier",
      mileage: 28100,
      fuelType: "HYBRID",
      clientIndexes: [3],
    },
    {
      licensePlate: "IJ-789-KL",
      vin: "5YJ3E1EA7KFXXXXX3",
      brand: "Tesla",
      model: "Model 3",
      year: 2020,
      color: "Noir",
      mileage: 62400,
      fuelType: "ELECTRIC",
      clientIndexes: [4, 2],
    },
    {
      licensePlate: "MN-012-OP",
      vin: "WVWZZZ1KZAWXXXXX4",
      brand: "Volkswagen",
      model: "Golf 8",
      year: 2023,
      color: "Bleu Atlantique",
      mileage: 18900,
      fuelType: "DIESEL",
      clientIndexes: [1, 5],
    },
  ];

  const vehicles = [];
  for (const spec of vehiclesSpec) {
    const vin = spec.vin.replace(/X/g, "1").slice(0, 17);
    const vehicle = await prisma.vehicle.create({
      data: {
        licensePlate: spec.licensePlate,
        vin,
        brand: spec.brand,
        model: spec.model,
        year: spec.year,
        firstRegistration: new Date(`${spec.year}-03-15`),
        color: spec.color,
        mileage: spec.mileage,
        fuelType: spec.fuelType,
        notes: "Véhicule reçu après épisode de grêle.",
        clients: {
          create: spec.clientIndexes.map((idx, i) => ({
            clientId: clients[idx].id,
            role: i === 0 ? "OWNER" : "INSURANCE",
          })),
        },
      },
    });
    vehicles.push(vehicle);
  }

  const estimates: Array<{
    number: string;
    status: EstimateStatus;
    client: number;
    vehicle: number;
    discount: number;
  }> = [
    { number: "EST-2026-0001", status: "APPROVED", client: 0, vehicle: 0, discount: 5 },
    { number: "EST-2026-0002", status: "SENT", client: 3, vehicle: 1, discount: 0 },
    { number: "EST-2026-0003", status: "DRAFT", client: 4, vehicle: 2, discount: 0 },
    { number: "EST-2026-0004", status: "INVOICED", client: 1, vehicle: 3, discount: 10 },
  ];

  for (const [i, est] of estimates.entries()) {
    const laborRate = 78;
    const lines = [
      { panel: "Toit", dents: 42, hours: 4.5, paint: 0, parts: 0, method: "PDR" as const, severity: "MEDIUM" as const },
      { panel: "Capot", dents: 18, hours: 2.0, paint: 0, parts: 0, method: "PDR" as const, severity: "LIGHT" as const },
      { panel: "Aile avant gauche", dents: 9, hours: 1.5, paint: 80, parts: 0, method: "CONVENTIONAL" as const, severity: "HEAVY" as const },
    ];
    const created = await prisma.estimate.create({
      data: {
        number: est.number,
        date: new Date(`2026-0${3 + i}-12`),
        damageDate: new Date("2026-03-02"),
        clientId: clients[est.client].id,
        vehicleId: vehicles[est.vehicle].id,
        estimatorId: i % 2 === 0 ? admin.id : estimator.id,
        status: est.status,
        discountType: "PERCENT",
        discountValue: est.discount,
        taxRate: 20,
        clientNotes: "Intervention PDR suite à orage de grêle. Délai estimé : 3 jours ouvrés.",
        internalNotes: "Vérifier accessibilité du pavillon avant confirmation.",
        lineItems: {
          create: lines.map((line, idx) => ({
            sortOrder: idx,
            panel: line.panel,
            damageType: "DENT",
            repairMethod: line.method,
            severity: line.severity,
            dentCount: line.dents,
            laborHours: line.hours,
            laborRate,
            partsCost: line.parts,
            paintCost: line.paint,
            lineTotal: line.hours * laborRate + line.parts + line.paint,
          })),
        },
        statusLogs: {
          create: {
            toStatus: est.status,
            userId: admin.id,
            note: "Création du devis (données de démonstration)",
          },
        },
      },
    });
    void created;
  }

  console.log("Seed OK");
  console.log("  admin@dmkservices.fr / Admin1234!");
  console.log("  estimator@dmkservices.fr / Estimator1234!");
  console.log("  viewer@dmkservices.fr / Viewer1234!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
