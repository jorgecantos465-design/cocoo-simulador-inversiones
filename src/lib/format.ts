import type { Currency } from "./finance";

export function formatAmount(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: Number.isInteger(safeValue) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(safeValue);
}

export function money(value: number, currency: Currency) {
  return `${currency} ${formatAmount(value)}`;
}

export function parseAmount(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
