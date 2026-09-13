import { round2 } from "./utils";
import defaultTable from "./hagelExpert.table.json";

export type DentOrientation = "HORIZONTAL" | "VERTICAL";

export type HagelTableRow = { d: number; h: number[]; v: number[] };

export type HagelExpertConfig = {
  wuPerHour: number;
  wuBaseValue: number;
  minSize: number;
  maxSize: number;
  sizeStep: number;
  maxDentsHorizontal: number;
  maxDentsVertical: number;
  aluminumPercent: number;
  gluePercent: number;
  dapPercent: number;
  finishPerPanel: number;
  preparationWu: number;
  finishVehicle: number;
  sizes: number[];
  table: HagelTableRow[];
};

export type HagelLineInput = {
  dentCount: number;
  dentSize: number;
  orientation: DentOrientation | string;
  aluminum?: boolean;
  glue?: boolean;
  dap?: boolean;
  extraWu?: number;
};

const DEFAULT_SIZES = defaultTable.sizes as number[];
const DEFAULT_ROWS = defaultTable.rows as HagelTableRow[];

export function defaultHagelExpertConfig(): HagelExpertConfig {
  return {
    wuPerHour: 10,
    wuBaseValue: 4,
    minSize: 10,
    maxSize: 80,
    sizeStep: 10,
    maxDentsHorizontal: 250,
    maxDentsVertical: 50,
    aluminumPercent: 25,
    gluePercent: 25,
    dapPercent: 40,
    finishPerPanel: 2.5,
    preparationWu: 6,
    finishVehicle: 13,
    sizes: [...DEFAULT_SIZES],
    table: DEFAULT_ROWS.map((row) => ({ d: row.d, h: [...row.h], v: [...row.v] })),
  };
}

function num(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseHagelExpertConfig(raw: unknown): HagelExpertConfig {
  const base = defaultHagelExpertConfig();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const sizes = Array.isArray(obj.sizes)
    ? (obj.sizes as unknown[]).map((s) => Number(s)).filter((s) => s > 0)
    : base.sizes;
  const table = Array.isArray(obj.table)
    ? (obj.table as unknown[])
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const item = row as { d?: number; h?: number[]; v?: number[] };
          if (!Array.isArray(item.h) || !Array.isArray(item.v)) return null;
          return {
            d: Number(item.d) || 0,
            h: item.h.map((n) => Number(n) || 0),
            v: item.v.map((n) => Number(n) || 0),
          };
        })
        .filter((row): row is HagelTableRow => !!row && row.d > 0)
    : base.table;
  return {
    wuPerHour: Math.max(1, num(obj.wuPerHour, base.wuPerHour)),
    wuBaseValue: Math.max(0, num(obj.wuBaseValue, base.wuBaseValue)),
    minSize: Math.max(1, num(obj.minSize, base.minSize)),
    maxSize: Math.max(1, num(obj.maxSize, base.maxSize)),
    sizeStep: Math.max(1, num(obj.sizeStep, base.sizeStep)),
    maxDentsHorizontal: Math.max(1, num(obj.maxDentsHorizontal, base.maxDentsHorizontal)),
    maxDentsVertical: Math.max(1, num(obj.maxDentsVertical, base.maxDentsVertical)),
    aluminumPercent: num(obj.aluminumPercent, base.aluminumPercent),
    gluePercent: num(obj.gluePercent, base.gluePercent),
    dapPercent: Math.max(0, num(obj.dapPercent, base.dapPercent)),
    finishPerPanel: Math.max(0, num(obj.finishPerPanel, base.finishPerPanel)),
    preparationWu: Math.max(0, num(obj.preparationWu, base.preparationWu)),
    finishVehicle: Math.max(0, num(obj.finishVehicle, base.finishVehicle)),
    sizes: sizes.length ? sizes : base.sizes,
    table: table.length ? table : base.table,
  };
}

export function hagelSizeOptions(config: HagelExpertConfig) {
  const sizes = config.sizes.length
    ? config.sizes
    : Array.from(
        { length: Math.floor((config.maxSize - config.minSize) / config.sizeStep) + 1 },
        (_, i) => config.minSize + i * config.sizeStep,
      );
  return sizes.filter((size) => size >= config.minSize && size <= config.maxSize);
}

function snapSize(config: HagelExpertConfig, size: number) {
  const options = hagelSizeOptions(config);
  if (!options.length) return config.minSize;
  return options.reduce((best, current) =>
    Math.abs(current - size) < Math.abs(best - size) ? current : best,
  );
}

function tableValue(config: HagelExpertConfig, dents: number, size: number, orientation: DentOrientation) {
  const options = hagelSizeOptions(config);
  const sizeIndex = options.indexOf(snapSize(config, size));
  if (sizeIndex < 0) return 0;
  const sorted = [...config.table].sort((a, b) => a.d - b.d);
  if (!sorted.length) return 0;
  const row = [...sorted].reverse().find((item) => item.d <= dents) ?? sorted[0];
  const cells = orientation === "VERTICAL" ? row.v : row.h;
  return Number(cells[sizeIndex]) || 0;
}

export function computeHagelWorkUnits(
  config: HagelExpertConfig,
  line: HagelLineInput,
  extrasWu = 0,
) {
  const dentsRaw = Math.max(0, Math.floor(Number(line.dentCount) || 0));
  const size = snapSize(config, Number(line.dentSize) || config.minSize);
  const orientation: DentOrientation = line.orientation === "VERTICAL" ? "VERTICAL" : "HORIZONTAL";
  if (!dentsRaw || !size) return 0;
  const maxDents =
    orientation === "VERTICAL" ? config.maxDentsVertical : config.maxDentsHorizontal;
  const dents = Math.min(dentsRaw, maxDents);
  const tableAw = tableValue(config, dents, size, orientation);
  const scaled = Math.round((tableAw + config.wuBaseValue) * (config.wuPerHour / 10));
  let wu = scaled;
  if (line.aluminum) wu = Math.round(wu * (1 + config.aluminumPercent / 100));
  if (line.glue) wu = Math.round(wu * (1 + config.gluePercent / 100));
  if (line.dap) wu = Math.round(wu * (1 - config.dapPercent / 100));
  const finish = Math.round(config.finishPerPanel * (config.wuPerHour / 10));
  const extra = Math.max(0, Number(line.extraWu) || 0);
  return Math.max(0, wu + finish + extrasWu + extra);
}

export function computeHagelHours(
  config: HagelExpertConfig,
  line: HagelLineInput,
  extrasWu = 0,
) {
  const wu = computeHagelWorkUnits(config, line, extrasWu);
  return round2(wu / config.wuPerHour);
}

export function hagelScaledWu(config: HagelExpertConfig, rawWu: number) {
  return Math.round(Math.max(0, rawWu) * (config.wuPerHour / 10));
}

export function hagelHoursFromRawWu(config: HagelExpertConfig, rawWu: number) {
  return round2(hagelScaledWu(config, rawWu) / config.wuPerHour);
}

export function hagelAmountFromRawWu(config: HagelExpertConfig, rawWu: number, laborRate: number) {
  return round2(hagelHoursFromRawWu(config, rawWu) * (Number(laborRate) || 0));
}

export type HagelVehicleExtras = {
  preparation?: boolean;
  finish?: boolean;
};

export function hagelVehicleExtrasWu(config: HagelExpertConfig, extras: HagelVehicleExtras = {}) {
  let raw = 0;
  if (extras.preparation) raw += config.preparationWu;
  if (extras.finish) raw += config.finishVehicle;
  return hagelScaledWu(config, raw);
}

export function applyHagelHoursToLines<T extends HagelLineInput & { repairMethod?: string; panel?: string; laborHours: number }>(
  lines: T[],
  config: HagelExpertConfig,
  _extras: HagelVehicleExtras = {},
) {
  void _extras;
  return lines.map((line) => {
    if (line.repairMethod === "PANEL_REPLACEMENT") return { ...line, laborHours: 0 };
    if (line.repairMethod !== "PDR") return line;
    return { ...line, laborHours: computeHagelHours(config, line, 0) };
  });
}
