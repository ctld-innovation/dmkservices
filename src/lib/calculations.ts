import { round2 } from "./utils";

export type RepairMethodKey = "PDR" | "CONVENTIONAL" | "PANEL_REPLACEMENT";

export type LineInput = {
  laborHours: number;
  laborRate: number;
  partsCost: number;
  paintCost: number;
  repairMethod?: RepairMethodKey | string | null;
  pricingMode?: "HOURLY" | "FIXED" | string | null;
  fixedAmount?: number | null;
};

export type ServiceQuote = { mode: "HOURLY" | "FIXED"; amount: number };
export type ServicePricing = Record<RepairMethodKey, ServiceQuote>;

export const SERVICE_KEYS: RepairMethodKey[] = ["PDR", "CONVENTIONAL", "PANEL_REPLACEMENT"];
export const FORFAIT_SERVICE_KEYS: RepairMethodKey[] = ["PDR"];

export const SERVICE_LABELS: Record<RepairMethodKey | "paint" | "dismantling", string> = {
  PDR: "DSP",
  CONVENTIONAL: "Conventionnel",
  PANEL_REPLACEMENT: "Remplacement",
  paint: "Peintures",
  dismantling: "Dégarnissage",
};

export function defaultServicePricing(): ServicePricing {
  return {
    PDR: { mode: "HOURLY", amount: 0 },
    CONVENTIONAL: { mode: "HOURLY", amount: 0 },
    PANEL_REPLACEMENT: { mode: "HOURLY", amount: 0 },
  };
}

export function parseServicePricing(raw: unknown): ServicePricing {
  const base = defaultServicePricing();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  for (const key of SERVICE_KEYS) {
    const item = obj[key];
    if (!item || typeof item !== "object") continue;
    const quote = item as { mode?: string; amount?: number };
    base[key] = {
      mode: quote.mode === "FIXED" ? "FIXED" : "HOURLY",
      amount: Number(quote.amount) || 0,
    };
  }
  return base;
}

export function isMethodFixed(pricing: ServicePricing | unknown, method?: string | null) {
  const parsed = parseServicePricing(pricing);
  const key = SERVICE_KEYS.includes(method as RepairMethodKey) ? (method as RepairMethodKey) : null;
  return key ? parsed[key].mode === "FIXED" : false;
}

/** Main-d'œuvre + pièces, hors peinture. */
export function computeLineLabor(item: LineInput) {
  const labor =
    item.pricingMode === "FIXED"
      ? Number(item.fixedAmount) || 0
      : (Number(item.laborHours) || 0) * (Number(item.laborRate) || 0);
  return round2(labor + (Number(item.partsCost) || 0));
}

export function computeLineTotal(item: LineInput, methodFixed = false) {
  if (methodFixed) return 0;
  return round2(computeLineLabor(item) + (Number(item.paintCost) || 0));
}

export type EstimateTotals = {
  services: Record<RepairMethodKey, number> & { paint: number; dismantling: number };
  subtotal: number;
  discount: number;
  afterDiscount: number;
  tax: number;
  grandTotal: number;
};

export function computeEstimateTotals(estimate: {
  lineItems?: Array<LineInput & { lineTotal?: number }>;
  servicePricing?: unknown;
  dismantlingAmount?: number | null;
  taxRate?: number;
}): EstimateTotals {
  const lines = estimate.lineItems ?? [];
  const pricing = parseServicePricing(estimate.servicePricing);
  const byMethod: Record<RepairMethodKey, number> = {
    PDR: 0,
    CONVENTIONAL: 0,
    PANEL_REPLACEMENT: 0,
  };
  let paint = 0;
  for (const line of lines) {
    paint += Number(line.paintCost) || 0;
    const method = SERVICE_KEYS.includes(line.repairMethod as RepairMethodKey)
      ? (line.repairMethod as RepairMethodKey)
      : "PDR";
    if (pricing[method].mode === "FIXED") continue;
    byMethod[method] = round2(byMethod[method] + computeLineLabor(line));
  }
  for (const key of SERVICE_KEYS) {
    if (pricing[key].mode === "FIXED") {
      byMethod[key] = round2(Number(pricing[key].amount) || 0);
    }
  }
  paint = round2(paint);
  const dismantling = round2(Number(estimate.dismantlingAmount) || 0);
  const subtotal = round2(
    byMethod.PDR + byMethod.CONVENTIONAL + byMethod.PANEL_REPLACEMENT + paint + dismantling,
  );
  const tax = round2((subtotal * (Number(estimate.taxRate) || 0)) / 100);
  const grandTotal = round2(subtotal + tax);
  return {
    services: { ...byMethod, paint, dismantling },
    subtotal,
    discount: 0,
    afterDiscount: subtotal,
    tax,
    grandTotal,
  };
}

export const METHOD_FLAG_COLUMNS = ["DSP", "DAP", "ALU", "COL", "RP"] as const;

export function estimateLineMethodFlags(line: {
  repairMethod?: string | null;
  dap?: boolean | null;
  aluminum?: boolean | null;
  glue?: boolean | null;
  paintReserve?: boolean | null;
}): Record<(typeof METHOD_FLAG_COLUMNS)[number], boolean> {
  return {
    DSP: line.repairMethod === "PDR",
    DAP: Boolean(line.dap),
    ALU: Boolean(line.aluminum),
    COL: Boolean(line.glue),
    RP: Boolean(line.paintReserve),
  };
}

export function methodFlagMark(on: boolean) {
  return on ? "X" : "";
}

export function serviceTotalRows(totals: EstimateTotals, includeDismantlingIfZero = false) {
  const rows: Array<{ label: string; value: number }> = [
    { label: SERVICE_LABELS.PDR, value: totals.services.PDR },
  ];
  if (totals.services.PANEL_REPLACEMENT > 0) {
    rows.push({ label: SERVICE_LABELS.PANEL_REPLACEMENT, value: totals.services.PANEL_REPLACEMENT });
  }
  rows.push({ label: SERVICE_LABELS.paint, value: totals.services.paint });
  if (includeDismantlingIfZero || totals.services.dismantling > 0) {
    rows.push({ label: SERVICE_LABELS.dismantling, value: totals.services.dismantling });
  }
  return rows;
}

export function sumEstimatesByStatus(
  estimates: Array<{
    status: string;
    taxRate: number;
    servicePricing?: unknown;
    dismantlingAmount?: number | null;
    discountType?: "PERCENT" | "FIXED";
    discountValue?: number;
    lineItems: Array<LineInput & { lineTotal?: number }>;
  }>,
) {
  const byStatus: Record<string, { count: number; amount: number }> = {};
  for (const est of estimates) {
    const current = byStatus[est.status] ?? { count: 0, amount: 0 };
    const { grandTotal } = computeEstimateTotals(est);
    byStatus[est.status] = {
      count: current.count + 1,
      amount: round2(current.amount + grandTotal),
    };
  }
  return byStatus;
}
