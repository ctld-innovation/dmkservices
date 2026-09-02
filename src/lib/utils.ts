export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value: number, locale = "fr-FR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(value || 0);
}

export function formatDate(value: Date | string | null | undefined, locale = "fr-FR") {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale);
}

export function formatDateTime(value: Date | string | null | undefined, locale = "fr-FR") {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function toInputDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function fullName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ").trim();
}

export function clientLabel(client: {
  companyName?: string | null;
  firstName: string;
  lastName: string;
}) {
  return client.companyName
    ? `${client.companyName} — ${fullName(client.firstName, client.lastName)}`
    : fullName(client.firstName, client.lastName);
}

export function vehicleLabel(v: { brand: string; model: string; licensePlate: string }) {
  return `${v.brand} ${v.model} (${v.licensePlate})`;
}

export function isValidVin(vin: string) {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim());
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function pagination(total: number, page: number, pageSize: number) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  return {
    total,
    page: current,
    pageSize,
    pages,
    skip: (current - 1) * pageSize,
  };
}

export function csvEscape(value: string | number | null | undefined) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
