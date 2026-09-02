import { z } from "zod";
import { isValidEmail, isValidVin } from "./utils";

export const clientSchema = z.object({
  type: z.enum(["WORKSHOP", "INTERMEDIARY", "INSURANCE", "FINAL_CLIENT"]),
  companyName: z.string().optional().nullable(),
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  email: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || isValidEmail(v), "Email invalide"),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  discountPercent: z.coerce.number().min(0).max(100).optional().default(0),
});

export const vehicleSchema = z.object({
  licensePlate: z.string().min(1, "Immatriculation requise"),
  vin: z
    .string()
    .min(1, "VIN requis")
    .refine((v) => isValidVin(v), "VIN invalide (17 caractères, sans I/O/Q)"),
  brand: z.string().min(1, "Marque requise"),
  model: z.string().min(1, "Modèle requis"),
  year: z.number().int().min(1950).max(2100).optional().nullable(),
  firstRegistration: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  mileage: z.number().int().min(0).optional().nullable(),
  fuelType: z.enum(["PETROL", "DIESEL", "ELECTRIC", "HYBRID"]).optional().nullable(),
  notes: z.string().optional().nullable(),
  clientIds: z.array(z.string()).min(1, "Au moins un client est requis"),
  clientRoles: z.record(z.string(), z.string()).optional(),
});

export const lineItemSchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int(),
  panel: z.string().min(1),
  damageType: z.enum(["DENT", "SCRATCH", "CRACK", "PAINT_DAMAGE"]),
  repairMethod: z.enum(["PDR", "CONVENTIONAL", "PANEL_REPLACEMENT"]),
  severity: z.enum(["LIGHT", "MEDIUM", "HEAVY"]),
  dentCount: z.number().int().min(0).default(0),
  laborHours: z.number().min(0).default(0),
  laborRate: z.number().min(0).default(0),
  laborRateId: z.string().optional().nullable(),
  pricingMode: z.enum(["HOURLY", "FIXED"]).optional().default("HOURLY"),
  fixedAmount: z.number().min(0).optional().default(0),
  partsCost: z.number().min(0).default(0),
  paintCost: z.number().min(0).default(0),
});

const serviceQuoteSchema = z.object({
  mode: z.enum(["HOURLY", "FIXED"]).optional().default("HOURLY"),
  amount: z.number().min(0).optional().default(0),
});

export const estimateSchema = z.object({
  date: z.string().min(1),
  damageDate: z.string().optional().nullable(),
  clientId: z.string().min(1, "Client requis"),
  vehicleId: z.string().min(1, "Véhicule requis"),
  estimatorId: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "APPROVED", "REJECTED", "INVOICED"]).optional(),
  discountType: z.enum(["PERCENT", "FIXED"]).optional().default("PERCENT"),
  discountValue: z.number().min(0).optional().default(0),
  taxRate: z.number().min(0).default(20),
  internalNotes: z.string().optional().nullable(),
  clientNotes: z.string().optional().nullable(),
  includePhotos: z.boolean().optional(),
  dismantlingAmount: z.number().min(0).optional().default(0),
  servicePricing: z
    .object({
      PDR: serviceQuoteSchema.optional(),
      CONVENTIONAL: serviceQuoteSchema.optional(),
      PANEL_REPLACEMENT: serviceQuoteSchema.optional(),
    })
    .optional()
    .nullable(),
  lineItems: z.array(lineItemSchema).min(1, "Ajoutez au moins une ligne"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const userSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "ESTIMATOR", "VIEWER"]),
  password: z.string().min(8).optional(),
  active: z.boolean().optional(),
});

export const settingsSchema = z.object({
  name: z.string().min(1),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  defaultLaborRate: z.number().min(0),
  defaultTaxRate: z.number().min(0),
  estimatePrefix: z.string().min(1),
  estimateSeqPad: z.number().int().min(3).max(8),
  carDiagram: z.enum(["assembled", "exploded"]).optional(),
  carDiagramMaps: z.record(z.string(), z.record(z.string(), z.string())).optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().optional().nullable(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  smtpFrom: z.string().optional().nullable(),
});
