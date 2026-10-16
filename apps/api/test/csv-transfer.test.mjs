/**
 * CSV reader/writer for import/export (MAOS-T118).
 * Run: node --test test/csv-transfer.test.mjs
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CsvError, csvNumber, csvText, parseCsv, toCsv } from '../src/modules/import-export/csv.ts';

const fails = (input, code, line) => {
  assert.throws(() => parseCsv(input, 10), (e) => e instanceof CsvError && e.code === code && (line === undefined || e.line === line), `${JSON.stringify(input)} -> ${code}`);
};

describe('parseCsv', () => {
  it('reads quotes, escaped quotes, commas and newlines inside quotes, CRLF and a BOM', () => {
    const r = parseCsv('﻿name,notes\r\n"Acme, GmbH","said ""hi""\nline 2"\r\nBeta,\n', 10);
    assert.deepEqual(r.header, ['name', 'notes']);
    assert.deepEqual(r.rows.map((x) => x.cells), [['Acme, GmbH', 'said "hi"\nline 2'], ['Beta', '']]);
    assert.deepEqual(r.rows.map((x) => x.line), [2, 4], 'line numbers count the embedded newline');
  });

  it('ignores blank lines and a missing final newline', () => {
    assert.deepEqual(parseCsv('a,b\n\n1,2\n\n3,4', 10).rows.map((x) => x.cells), [['1', '2'], ['3', '4']]);
  });

  it('refuses malformed input deterministically, naming the line', () => {
    fails('a,b\n"open,2\n', 'UNTERMINATED_QUOTE', 2);
    fails('a,b\n"x"y,2\n', 'TEXT_AFTER_QUOTE', 2);
    fails('a,b\n1,2,3\n', 'COLUMN_COUNT', 2);
    fails('a,b\n1\n', 'COLUMN_COUNT', 2);
    fails('', 'EMPTY');
    fails('\n\n', 'EMPTY');
  });

  it('enforces the row limit', () => {
    const ok = 'a\n' + '1\n'.repeat(10);
    assert.equal(parseCsv(ok, 10).rows.length, 10);
    fails(ok + '1\n', 'TOO_MANY_ROWS');
  });
});

describe('CSV writing', () => {
  it('neutralises spreadsheet formulas in user text', () => {
    for (const v of ['=1+1', '+SUM(A1)', '-2', '@cmd', '\tx', '\rx']) assert.ok(csvText(v).replace(/^"/, '').startsWith("'"), v);
    assert.equal(csvText('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
    assert.equal(csvText('plain'), 'plain');
  });

  it('quotes commas, quotes, newlines and surrounding spaces; empties nulls', () => {
    assert.equal(csvText('a,b'), '"a,b"');
    assert.equal(csvText('say "x"'), '"say ""x"""');
    assert.equal(csvText('two\nlines'), '"two\nlines"');
    assert.equal(csvText(' padded'), '" padded"');
    assert.equal(csvText(null), '');
    assert.equal(csvNumber(125005), '125005');
    assert.equal(csvNumber(null), '');
  });

  it('round-trips through the reader', () => {
    const cells = ['Acme, "GmbH"', 'multi\nline', '=evil', ''];
    const out = toCsv(['a', 'b', 'c', 'd'], [cells.map(csvText)]);
    assert.ok(out.endsWith('\r\n'));
    assert.deepEqual(parseCsv(out, 10).rows[0].cells, ['Acme, "GmbH"', 'multi\nline', "'=evil", '']);
  });
});
