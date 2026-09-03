/**
 * Integer-cent money helpers.
 *
 * The API stores and computes every amount in integer cents, so the browser
 * must never round-trip an amount through a float. These live in lib/ rather
 * than beside the invoice editor because opportunities, invoices and the client
 * portal all need the same conversion, and two implementations of it would
 * eventually disagree by a cent.
 */

/**
 * Converts a major-unit string to integer cents.
 *
 * Parsing the whole and fractional halves separately avoids the rounding error
 * that Math.round(parseFloat(x) * 100) introduces for values like "1.005".
 * Returns null when the input is not a valid amount.
 */
export function toCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;

  const [whole, fraction = ''] = trimmed.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Renders integer cents without ever touching a float. */
export function formatCents(cents: number, currency = 'EUR'): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const body = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  return `${negative ? '-' : ''}${body} ${currency}`;
}
