/** Marques et modèles courants (marché FR / EU), utilisés comme listes de suggestions. */
export const VEHICLE_CATALOG: Record<string, string[]> = {
  Abarth: ["500", "595", "695", "124 Spider"],
  Aiways: ["U5", "U6"],
  "Alfa Romeo": ["Giulia", "Stelvio", "Tonale", "Junior", "Giulietta", "MiTo", "159", "147", "156", "166", "Brera", "Spider", "4C"],
  Alpine: ["A110", "A290", "A390"],
  "Aston Martin": ["DB11", "DB12", "Vantage", "DBS", "DBX"],
  Audi: [
    "A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q4 e-tron", "Q5", "Q6 e-tron", "Q7", "Q8",
    "TT", "R8", "e-tron GT", "e-tron", "S3", "S4", "RS3", "RS6",
  ],
  Bentley: ["Continental GT", "Flying Spur", "Bentayga"],
  BMW: [
    "Série 1", "Série 2", "Série 3", "Série 4", "Série 5", "Série 6", "Série 7", "Série 8",
    "X1", "X2", "X3", "X4", "X5", "X6", "X7", "XM", "Z4", "i3", "i4", "i5", "i7", "iX", "iX1", "iX2", "iX3",
  ],
  BYD: ["Atto 3", "Dolphin", "Seal", "Seal U", "Tang", "Han", "Atto 2"],
  Cadillac: ["Escalade", "XT4", "Lyriq"],
  Chevrolet: ["Camaro", "Corvette", "Captiva", "Trax", "Spark", "Cruze", "Aveo"],
  Chrysler: ["300C", "Voyager", "Grand Voyager", "PT Cruiser"],
  Citroën: [
    "C1", "C2", "C3", "C3 Aircross", "C3 Picasso", "C4", "C4 Cactus", "C4 Picasso", "C4 SpaceTourer",
    "C4 X", "C5", "C5 Aircross", "C5 X", "C6", "C8", "Berlingo", "Jumpy", "Jumper", "Ami", "ë-C3", "ë-C4",
    "SpaceTourer", "DS3", "DS4", "DS5",
  ],
  Cupra: ["Formentor", "Leon", "Ateca", "Born", "Tavascan", "Terramar"],
  Dacia: ["Sandero", "Logan", "Duster", "Jogger", "Spring", "Lodgy", "Dokker", "Bigster"],
  Dodge: ["Ram", "Challenger", "Charger", "Durango", "Journey", "Caliber"],
  DS: ["DS 3", "DS 4", "DS 5", "DS 7", "DS 9", "DS 3 Crossback", "DS 4 Crossback", "DS 7 Crossback"],
  Ferrari: ["Roma", "Roma Spider", "296 GTB", "SF90", "Purosangue", "F8", "Portofino"],
  Fiat: [
    "500", "500X", "500L", "500e", "Panda", "Punto", "Tipo", "Bravo", "Doblo", "Qubo", "Fiorino",
    "Ducato", "Talento", "Scudo", "Freemont", "Grande Punto",
  ],
  Fisker: ["Ocean"],
  Ford: [
    "Fiesta", "Focus", "Mondeo", "Puma", "Kuga", "EcoSport", "Explorer", "Mustang", "Mustang Mach-E",
    "Ranger", "Transit", "Transit Custom", "Tourneo", "Tourneo Custom", "S-Max", "Galaxy", "C-Max",
    "B-Max", "Ka", "Ka+", "Fusion", "Edge",
  ],
  Genesis: ["G70", "G80", "GV60", "GV70", "GV80"],
  Honda: ["Civic", "Jazz", "CR-V", "HR-V", "ZR-V", "e:Ny1", "Accord", "FR-V", "Insight"],
  Hummer: ["H2", "H3"],
  Hyundai: [
    "i10", "i20", "i30", "i40", "Bayon", "Kona", "Tucson", "Santa Fe", "Ioniq", "Ioniq 5", "Ioniq 6",
    "Ioniq 9", "ix35", "ix20", "Santa Cruz",
  ],
  Infiniti: ["Q30", "Q50", "QX30", "QX50", "QX70"],
  Isuzu: ["D-Max", "N-Series"],
  Iveco: ["Daily", "Eurocargo"],
  Jaguar: ["XE", "XF", "XJ", "F-Pace", "E-Pace", "I-Pace", "F-Type"],
  Jeep: ["Renegade", "Compass", "Avenger", "Cherokee", "Grand Cherokee", "Wrangler", "Gladiator"],
  Kia: [
    "Picanto", "Rio", "Ceed", "Proceed", "XCeed", "Stonic", "Niro", "Sportage", "Sorento", "EV3",
    "EV6", "EV9", "Soul", "Venga", "Carens", "Optima",
  ],
  Lada: ["Niva", "Granta"],
  Lamborghini: ["Huracán", "Urus", "Revuelto", "Aventador"],
  Lancia: ["Ypsilon", "Delta", "Musa", "Phedra", "Thesis"],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Range Rover Velar", "Freelander"],
  Leapmotor: ["T03", "C10", "B10"],
  Lexus: ["CT", "IS", "ES", "LS", "NX", "RX", "UX", "LBX", "RZ", "GX", "LC"],
  Lotus: ["Emira", "Eletre", "Elise", "Exige", "Evora"],
  Lucid: ["Air", "Gravity"],
  Maserati: ["Ghibli", "Quattroporte", "Levante", "Grecale", "GranTurismo", "MC20", "GranCabrio"],
  Mazda: ["2", "3", "6", "CX-3", "CX-30", "CX-5", "CX-60", "CX-80", "MX-5", "MX-30"],
  McLaren: ["Artura", "720S", "750S", "GT"],
  "Mercedes-Benz": [
    "Classe A", "Classe B", "Classe C", "Classe E", "Classe S", "CLA", "CLS", "GLA", "GLB", "GLC",
    "GLE", "GLS", "G", "EQA", "EQB", "EQC", "EQE", "EQS", "EQV", "Vito", "Viano", "Sprinter", "Citan",
    "Classe V", "SL", "SLC", "AMG GT",
  ],
  MG: ["MG3", "MG4", "MG5", "ZS", "HS", "Marvel R", "Cyberster", "MG ZS EV"],
  Mini: ["Cooper", "Cooper S", "One", "Clubman", "Countryman", "Cabrio", "Paceman", "Aceman", "Countryman SE"],
  Mitsubishi: ["ASX", "Eclipse Cross", "Outlander", "Pajero", "L200", "Colt", "Space Star", "Lancer"],
  Nissan: [
    "Micra", "Note", "Leaf", "Juke", "Qashqai", "X-Trail", "Ariya", "Townstar", "Navara", "Primera",
    "Pulsar", "370Z", "GT-R", "Interstar", "NV200", "NV300", "NV400",
  ],
  Opel: [
    "Corsa", "Astra", "Insignia", "Mokka", "Crossland", "Grandland", "Combo", "Vivaro", "Movano",
    "Zafira", "Meriva", "Adam", "Karl", "Antara", "Frontera",
  ],
  Peugeot: [
    "107", "108", "206", "207", "208", "2008", "301", "307", "308", "3008", "407", "408", "4008",
    "508", "5008", "607", "807", "1007", "RCZ", "Partner", "Rifter", "Expert", "Traveller", "Boxer",
    "e-208", "e-2008", "e-308", "e-3008", "e-5008",
  ],
  Polestar: ["2", "3", "4"],
  Porsche: ["911", "718 Cayman", "718 Boxster", "Panamera", "Cayenne", "Macan", "Taycan"],
  Renault: [
    "Twingo", "Clio", "Captur", "Megane", "Megane E-Tech", "Scenic", "Scenic E-Tech", "Arkana",
    "Austral", "Kadjar", "Koleos", "Rafale", "Symbioz", "Talisman", "Laguna", "Fluence", "Latitude",
    "Espace", "Kangoo", "Trafic", "Master", "Express", "Zoe", "Twizy", "5 E-Tech", "4 E-Tech", "R5",
  ],
  "Rolls-Royce": ["Ghost", "Phantom", "Cullinan", "Spectre"],
  Saab: ["9-3", "9-5", "900"],
  Seat: ["Ibiza", "Leon", "Arona", "Ateca", "Tarraco", "Alhambra", "Mii", "Toledo", "Altea", "Exeo", "Cordoba"],
  Skoda: ["Fabia", "Scala", "Octavia", "Superb", "Kamiq", "Karoq", "Kodiaq", "Enyaq", "Elroq", "Roomster", "Yeti", "Rapid", "Citigo"],
  Smart: ["Fortwo", "Forfour", "#1", "#3"],
  SsangYong: ["Tivoli", "Korando", "Rexton", "Musso", "Actyon"],
  Subaru: ["Impreza", "XV", "Forester", "Outback", "Solterra", "BRZ", "Legacy"],
  Suzuki: ["Swift", "Ignis", "Vitara", "S-Cross", "Jimny", "Across", "Swace", "Celerio", "SX4", "Alto", "Baleno"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
  Toyota: [
    "Aygo", "Aygo X", "Yaris", "Yaris Cross", "Corolla", "Corolla Cross", "C-HR", "RAV4", "Highlander",
    "Camry", "Prius", "Prius+", "Auris", "Avensis", "Verso", "Proace", "Proace City", "Proace Max",
    "Land Cruiser", "Hilux", "bZ4X", "Supra", "GR86", "GR Yaris",
  ],
  VinFast: ["VF 8", "VF 9", "VF 6", "VF 7"],
  Volkswagen: [
    "up!", "Polo", "Golf", "Golf Plus", "Passat", "Arteon", "ID.3", "ID.4", "ID.5", "ID.7", "ID. Buzz",
    "T-Cross", "T-Roc", "Tiguan", "Touareg", "Touran", "Sharan", "Caddy", "Transporter", "Multivan",
    "Caravelle", "Crafter", "Amarok", "Scirocco", "Beetle", "Jetta", "CC",
  ],
  Volvo: ["C30", "C40", "S40", "S60", "S90", "V40", "V60", "V90", "XC40", "XC60", "XC90", "EX30", "EX90"],
  XPENG: ["G6", "G9", "P7"],
};

export function catalogBrands() {
  return Object.keys(VEHICLE_CATALOG).sort((a, b) => a.localeCompare(b, "fr"));
}

export function lookupsToOptions(
  items: Array<{ category: string; label: string; value: string; active?: boolean }>,
) {
  const active = items.filter((item) => item.active !== false);
  return {
    brands: active
      .filter((item) => item.category === "BRAND")
      .map((item) => item.label)
      .sort((a, b) => a.localeCompare(b, "fr")),
    models: active
      .filter((item) => item.category === "MODEL")
      .map((item) => ({ brand: item.value, label: item.label })),
  };
}
