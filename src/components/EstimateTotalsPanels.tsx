import { formatCurrency, cn } from "@/lib/utils";
import { serviceTotalRows, type EstimateTotals } from "@/lib/calculations";

export function EstimateTotalsPanels({
  totals,
  taxRate,
  compact = false,
}: {
  totals: EstimateTotals;
  taxRate: number;
  compact?: boolean;
}) {
  const box = compact
    ? "overflow-hidden rounded-md border border-line bg-mist text-[12px]"
    : "rounded-xl border border-line bg-white p-5 text-sm";
  const titleCls = compact
    ? "px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-navy"
    : "mb-3 font-semibold text-navy";
  const rowCls = compact ? "flex justify-between px-3 py-1.5" : "flex justify-between py-0.5";

  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-2 gap-3" : "sm:grid-cols-2")}>
      <div className={box}>
        <h2 className={titleCls}>Total réparation</h2>
        <dl>
          {serviceTotalRows(totals, true).map((row) => (
            <div key={row.label} className={rowCls}>
              <dt>{row.label}</dt>
              <dd>{formatCurrency(row.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className={box}>
        <h2 className={titleCls}>Prix total</h2>
        <dl>
          <div className={rowCls}>
            <dt>Sous-total</dt>
            <dd>{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div className={rowCls}>
            <dt>TVA {taxRate} %</dt>
            <dd>{formatCurrency(totals.tax)}</dd>
          </div>
          <div
            className={cn(
              rowCls,
              compact
                ? "bg-amber font-bold text-navy"
                : "mt-2 border-t border-line pt-2 text-base font-semibold text-navy",
            )}
          >
            <dt>Total TTC</dt>
            <dd>{formatCurrency(totals.grandTotal)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
