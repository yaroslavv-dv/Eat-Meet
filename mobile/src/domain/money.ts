import type { Cents } from './types';

/** Formats integer cents as euros, e.g. 1050 → "€10.50". */
export function formatEUR(cents: Cents, options: { compact?: boolean } = {}): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const euros = Math.floor(abs / 100);
  const rest = abs % 100;
  const eurosText = euros.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = options.compact && rest === 0 ? `€${eurosText}` : `€${eurosText}.${rest.toString().padStart(2, '0')}`;
  return negative ? `−${body}` : body;
}

/**
 * Parses user input such as "7,50", "7.5" or "€ 7" into cents.
 * Returns null for empty or invalid input. Negative values are rejected.
 */
export function parseEuroInput(input: string): Cents | null {
  const cleaned = input.replace(/[€\s]/g, '').replace(',', '.');
  if (cleaned === '') return null;
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  return parseInt(whole, 10) * 100 + parseInt(fraction.padEnd(2, '0') || '0', 10);
}

/** Cents → editable text, e.g. 750 → "7.50". */
export function centsToInput(cents: Cents | null | undefined): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

export function roundToStep(cents: Cents, step: Cents): Cents {
  return Math.round(cents / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
