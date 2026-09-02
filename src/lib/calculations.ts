import { round2 } from "./utils";

export type LineInput = {
  laborHours: number;
  laborRate: number;
  partsCost: number;
  paintCost: number;
};

export function computeLineTotal(item: LineInput) {
  return round2(
    (Number(item.laborHours) || 0) * (Number(item.laborRate) || 0) +
      (Number(item.partsCost) || 0) +
      (Number(item.paintCost) || 0),
  );
}

export function computeTotals(
  lines: Array<LineInput & { lineTotal?: number }>,
  discountType: "PERCENT" | "FIXED",
  discountValue: number,
  taxRate: number,
) {
  const subtotal = round2(
    lines.reduce((sum, line) => sum + (line.lineTotal ?? computeLineTotal(line)), 0),
  );
  const discount = round2(
    discountType === "PERCENT"
      ? (subtotal * (Number(discountValue) || 0)) / 100
      : Number(discountValue) || 0,
  );
  const afterDiscount = round2(Math.max(0, subtotal - discount));
  const tax = round2((afterDiscount * (Number(taxRate) || 0)) / 100);
  const grandTotal = round2(afterDiscount + tax);
  return { subtotal, discount, afterDiscount, tax, grandTotal };
}
