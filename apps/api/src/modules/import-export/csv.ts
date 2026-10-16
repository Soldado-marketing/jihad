/**
 * Minimal RFC 4180 CSV reader/writer for MAOS-T118. No dependency: the
 * format is small, and owning it keeps the failure modes deterministic.
 *
 * Reading: comma separator, double-quote quoting with "" escapes, CRLF or LF
 * line ends, an optional UTF-8 BOM, blank lines ignored. Anything else - an
 * unterminated quote, text after a closing quote, a row with the wrong number
 * of cells - is an error naming the line, never a guess.
 *
 * Writing: every cell quoted when needed, and user-controlled text that a
 * spreadsheet would run as a formula (=, +, -, @, tab, CR) is prefixed with
 * an apostrophe (OWASP "CSV injection").
 */

export type CsvErrorCode = 'UNTERMINATED_QUOTE' | 'TEXT_AFTER_QUOTE' | 'COLUMN_COUNT' | 'EMPTY' | 'TOO_MANY_ROWS';

// Plain fields, no parameter properties: tests load this file with Node's type stripping.
export class CsvError extends Error {
  readonly line: number;
  readonly code: CsvErrorCode;
  constructor(line: number, code: CsvErrorCode, message: string) {
    super(message);
    this.line = line;
    this.code = code;
  }
}

export interface ParsedCsv {
  header: string[];
  /** Data rows with their 1-based line number in the file. */
  rows: { line: number; cells: string[] }[];
}

export function parseCsv(input: string, maxRows: number): ParsedCsv {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let afterQuote = false;
  let line = 1;
  let recordLine = 1;
  let i = 0;

  const endCell = () => {
    cells.push(cell);
    cell = '';
    afterQuote = false;
  };
  const endRecord = () => {
    endCell();
    const blank = cells.length === 1 && cells[0] === '';
    if (!blank) records.push({ line: recordLine, cells });
    if (records.length > maxRows + 1) throw new CsvError(recordLine, 'TOO_MANY_ROWS', `More than ${maxRows} data rows.`);
    cells = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        afterQuote = true;
        i += 1;
        continue;
      }
      if (ch === '\n') line += 1;
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === ',') {
      endCell();
      i += 1;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      endRecord();
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
      line += 1;
      recordLine = line;
      continue;
    }
    if (afterQuote) throw new CsvError(line, 'TEXT_AFTER_QUOTE', `Line ${line}: text after a closing quote.`);
    if (ch === '"' && cell === '') {
      quoted = true;
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (quoted) throw new CsvError(recordLine, 'UNTERMINATED_QUOTE', `Line ${recordLine}: a quoted value is never closed.`);
  if (cell !== '' || cells.length > 0 || afterQuote) endRecord();

  if (records.length === 0) throw new CsvError(1, 'EMPTY', 'The file has no header row.');
  const [head, ...rows] = records;
  const header = head.cells.map((h) => h.trim());
  for (const r of rows) {
    if (r.cells.length !== header.length) {
      throw new CsvError(r.line, 'COLUMN_COUNT', `Line ${r.line}: ${r.cells.length} values, the header has ${header.length}.`);
    }
  }
  return { header, rows };
}

const FORMULA_START = /^[=+\-@\t\r]/;

/** One cell of user-controlled text: formula-neutralised and quoted when needed. */
export function csvText(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) || safe !== safe.trim() ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** A number we produced ourselves (cents, counts): never a formula, never quoted. */
export function csvNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

export function toCsv(header: readonly string[], rows: readonly string[][]): string {
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n') + '\r\n';
}
