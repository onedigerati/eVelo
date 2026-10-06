import { createHash } from 'node:crypto';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const presetDirectory = path.join(root, 'src/data/presets');
const expectedHeader = ['symbol', 'name', 'assetClass', 'year', 'return'];
const assetClasses = new Set(['equity_index', 'equity_stock', 'bond', 'commodity']);
const usage = 'Usage: npm run refresh:dry-run -- --source SOURCE_PATH --manifest MANIFEST_PATH --output-dir OUTPUT_DIR';
const compareText = (left, right) => left === right ? 0 : left < right ? -1 : 1;

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    if (!['--source', '--manifest', '--output-dir'].includes(flag)) {
      throw new Error(`Unknown argument: ${flag}. ${usage}`);
    }
    if (Object.hasOwn(options, flag)) throw new Error(`Duplicate flag: ${flag}. ${usage}`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}. ${usage}`);
    options[flag] = path.resolve(value);
  }
  for (const flag of ['--source', '--manifest', '--output-dir']) {
    if (!options[flag]) throw new Error(`Missing required ${flag}. ${usage}`);
  }
  return options;
}

function addDiagnostic(diagnostics, {
  severity = 'blocking',
  code,
  file,
  row,
  symbol,
  year,
  field,
  message,
}) {
  diagnostics.push({ severity, code, file, row, symbol, year, field, message });
}

function findDuplicateJsonKeys(text) {
  let index = 0;
  const duplicates = [];

  function whitespace() {
    while (/\s/.test(text[index] ?? '') && index < text.length) index++;
  }

  function readString() {
    if (text[index] !== '"') throw new Error('Expected a JSON string.');
    const start = index++;
    while (index < text.length) {
      const character = text[index++];
      if (character === '"') return JSON.parse(text.slice(start, index));
      if (character === '\\') index++;
    }
    throw new Error('Invalid JSON string.');
  }

  function object(fieldPath) {
    index++;
    whitespace();
    const keys = new Set();
    if (text[index] === '}') {
      index++;
      return;
    }
    while (index < text.length) {
      whitespace();
      const key = readString();
      const keyPath = fieldPath ? `${fieldPath}.${key}` : key;
      if (keys.has(key)) duplicates.push({ key, field: keyPath });
      keys.add(key);
      whitespace();
      if (text[index++] !== ':') throw new Error('Invalid JSON object member.');
      value(keyPath);
      whitespace();
      if (text[index] === '}') {
        index++;
        return;
      }
      if (text[index++] !== ',') throw new Error('Invalid JSON object separator.');
    }
    throw new Error('Unterminated JSON object.');
  }

  function array(fieldPath) {
    index++;
    whitespace();
    if (text[index] === ']') {
      index++;
      return;
    }
    let item = 0;
    while (index < text.length) {
      value(`${fieldPath}[${item++}]`);
      whitespace();
      if (text[index] === ']') {
        index++;
        return;
      }
      if (text[index++] !== ',') throw new Error('Invalid JSON array separator.');
    }
    throw new Error('Unterminated JSON array.');
  }

  function value(fieldPath) {
    whitespace();
    if (text[index] === '{') return object(fieldPath);
    if (text[index] === '[') return array(fieldPath);
    if (text[index] === '"') {
      readString();
      return;
    }
    const start = index;
    while (index < text.length && !/[\s,}\]]/.test(text[index])) index++;
    if (start === index) throw new Error('Invalid JSON value.');
  }

  value('');
  whitespace();
  if (index !== text.length) throw new Error('Unexpected content after JSON value.');
  return duplicates;
}

function parseJson(text, file, diagnostics) {
  let duplicates;
  try {
    duplicates = findDuplicateJsonKeys(text);
  } catch (error) {
    addDiagnostic(diagnostics, {
      code: 'json-syntax',
      file,
      field: '$',
      message: `Invalid JSON syntax: ${error.message}`,
    });
    return null;
  }
  for (const duplicate of duplicates) {
    addDiagnostic(diagnostics, {
      code: 'json-duplicate-key',
      file,
      field: duplicate.field,
      message: `Duplicate JSON object key ${JSON.stringify(duplicate.key)}.`,
    });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    addDiagnostic(diagnostics, {
      code: 'json-syntax',
      file,
      field: '$',
      message: `Invalid JSON syntax: ${error.message}`,
    });
    return null;
  }
}

function readReviewedPair(options, diagnostics) {
  const sourcePath = options['--source'];
  const manifestPath = options['--manifest'];
  const sourceFilename = path.basename(sourcePath);
  const manifestFilename = path.basename(manifestPath);
  const sourceFormat = path.extname(sourcePath).slice(1);
  let sourceBytes = null;
  let manifestBytes = null;
  let sourceRealPath = null;
  let manifestRealPath = null;

  if (!['csv', 'json'].includes(sourceFormat)) {
    addDiagnostic(diagnostics, {
      code: 'source-extension',
      file: sourceFilename,
      field: 'source',
      message: 'Source extension must be .csv or .json.',
    });
  }
  if (manifestPath !== `${sourcePath}.manifest.json`) {
    addDiagnostic(diagnostics, {
      code: 'manifest-pairing',
      file: manifestFilename,
      field: 'manifest',
      message: `Manifest must be adjacent and named ${sourceFilename}.manifest.json.`,
    });
  }

  try {
    sourceBytes = readFileSync(sourcePath);
    sourceRealPath = realpathSync(sourcePath);
  } catch (error) {
    addDiagnostic(diagnostics, {
      code: 'source-read',
      file: sourceFilename,
      field: 'source',
      message: `Cannot read selected source file (${error.code ?? 'filesystem error'}).`,
    });
  }
  try {
    manifestBytes = readFileSync(manifestPath);
    manifestRealPath = realpathSync(manifestPath);
  } catch (error) {
    addDiagnostic(diagnostics, {
      code: 'manifest-read',
      file: manifestFilename,
      field: 'manifest',
      message: `Cannot read selected manifest file (${error.code ?? 'filesystem error'}).`,
    });
  }
  if (sourceRealPath && manifestRealPath && manifestRealPath !== `${sourceRealPath}.manifest.json`) {
    addDiagnostic(diagnostics, {
      code: 'manifest-pairing',
      file: manifestFilename,
      field: 'manifest',
      message: 'Resolved source and manifest must form an adjacent pair.',
    });
  }

  const diagnosticsBeforeManifest = diagnostics.length;
  const manifest = manifestBytes
    ? parseJson(manifestBytes.toString('utf8'), manifestFilename, diagnostics)
    : null;
  const manifestJsonFailed = diagnostics.slice(diagnosticsBeforeManifest)
    .some(item => item.code === 'json-syntax');
  if (manifestBytes && !manifestJsonFailed && !isObject(manifest)) {
    addDiagnostic(diagnostics, {
      code: 'manifest-root',
      file: manifestFilename,
      field: '$',
      message: 'Manifest root must be an object.',
    });
  }
  if (manifest && typeof manifest === 'object' && !Array.isArray(manifest)) {
    if (manifest.snapshotFilename !== sourceFilename) {
      addDiagnostic(diagnostics, {
        code: 'snapshot-filename',
        file: manifestFilename,
        field: 'snapshotFilename',
        message: `Snapshot filename must match selected source basename ${JSON.stringify(sourceFilename)}.`,
      });
    }
    if (sourceBytes) {
      const digest = createHash('sha256').update(sourceBytes).digest('hex');
      if (manifest.snapshotSha256 !== digest) {
        addDiagnostic(diagnostics, {
          code: 'snapshot-sha256',
          file: manifestFilename,
          field: 'snapshotSha256',
          message: 'Manifest SHA-256 does not match the exact selected source bytes.',
        });
      }
    }
  }
  return { sourceFilename, sourceFormat, sourceBytes, manifest, manifestFilename };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateClosedObject(value, field, required, allowed, file, diagnostics, context = {}) {
  if (!isObject(value)) {
    addDiagnostic(diagnostics, {
      ...context,
      file,
      field: field || '$',
      code: 'object-type',
      message: 'Value must be an object.',
    });
    return null;
  }
  for (const key of Object.keys(value).sort(compareText)) {
    if (!allowed.includes(key)) {
      addDiagnostic(diagnostics, {
        ...context,
        file,
        field: field ? `${field}.${key}` : key,
        code: 'unknown-property',
        message: 'Property is not allowed by the closed input contract.',
      });
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      addDiagnostic(diagnostics, {
        ...context,
        file,
        field: field ? `${field}.${key}` : key,
        code: 'required-property',
        message: 'Required property is missing.',
      });
    }
  }
  return value;
}

function validateText(value, field, file, diagnostics, {
  minLength = 1,
  rejectPlaceholder = false,
  context = {},
} = {}) {
  if (typeof value !== 'string') {
    addDiagnostic(diagnostics, {
      ...context,
      file,
      field,
      code: 'text-type',
      message: 'Value must be a string.',
    });
    return false;
  }
  if (value.length < minLength || !/\S/.test(value)) {
    addDiagnostic(diagnostics, {
      ...context,
      file,
      field,
      code: 'text-required',
      message: `Value must contain at least ${minLength} nonblank characters.`,
    });
    return false;
  }
  if (rejectPlaceholder && /^(?:tbd|to be determined|unknown|n\/?a|none|null|not applicable|x|\?|-)$/i.test(value.trim())) {
    addDiagnostic(diagnostics, {
      ...context,
      file,
      field,
      code: 'placeholder-text',
      message: 'Placeholder-only text is not accepted.',
    });
    return false;
  }
  return true;
}

function validateYears(value, field, file, diagnostics, context = {}) {
  if (!Array.isArray(value)) {
    addDiagnostic(diagnostics, {
      ...context,
      file,
      field,
      code: 'years-type',
      message: 'Value must be an array of integer calendar years.',
    });
    return [];
  }
  if (!value.length) {
    addDiagnostic(diagnostics, {
      ...context,
      file,
      field,
      code: 'years-empty',
      message: 'At least one calendar year is required.',
    });
  }
  const seen = new Set();
  value.forEach((year, index) => {
    const yearField = `${field}[${index}]`;
    if (!Number.isInteger(year) || year < 1 || year > 9999) {
      addDiagnostic(diagnostics, {
        ...context,
        file,
        year: Number.isInteger(year) ? year : undefined,
        field: yearField,
        code: 'year-range',
        message: 'Year must be an integer from 1 through 9999.',
      });
    } else if (seen.has(year)) {
      addDiagnostic(diagnostics, {
        ...context,
        file,
        year,
        field: yearField,
        code: 'duplicate-year',
        message: 'Calendar year is duplicated.',
      });
    }
    seen.add(year);
  });
  return value.filter(year => Number.isInteger(year) && year >= 1 && year <= 9999);
}

function validateManifest(manifest, file, diagnostics) {
  if (manifest === null) return;
  const object = validateClosedObject(
    manifest,
    '',
    ['sourceAttribution', 'snapshotFilename', 'snapshotSha256', 'methodology', 'coveredCalendarYears',
      'assetScope', 'reviewer', 'reviewDate', 'exceptions'],
    ['sourceAttribution', 'snapshotFilename', 'snapshotSha256', 'methodology', 'coveredCalendarYears',
      'assetScope', 'reviewer', 'reviewDate', 'exceptions'],
    file,
    diagnostics,
  );
  if (!object) return;

  validateText(object.sourceAttribution, 'sourceAttribution', file, diagnostics, { minLength: 12, rejectPlaceholder: true });
  if (typeof object.snapshotFilename !== 'string' ||
      !/^[^/\\\r\n]+\.(csv|json)$/.test(object.snapshotFilename)) {
    addDiagnostic(diagnostics, {
      file, field: 'snapshotFilename', code: 'snapshot-filename-format',
      message: 'Filename must be a basename ending in .csv or .json.',
    });
  }
  if (typeof object.snapshotSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(object.snapshotSha256)) {
    addDiagnostic(diagnostics, {
      file, field: 'snapshotSha256', code: 'snapshot-sha256-format',
      message: 'SHA-256 must be 64 lowercase hexadecimal characters.',
    });
  }

  const method = validateClosedObject(
    object.methodology,
    'methodology',
    ['returnConvention', 'dividendsReinvested', 'endpoints', 'units', 'decimalPlaces', 'etfReturnPolicy'],
    ['returnConvention', 'dividendsReinvested', 'endpoints', 'units', 'decimalPlaces', 'etfReturnPolicy'],
    file,
    diagnostics,
  );
  if (method) {
    const constants = {
      returnConvention: 'calendar-year total returns',
      dividendsReinvested: true,
      endpoints: 'last-trading-day to last-trading-day',
      units: 'decimal',
      decimalPlaces: 4,
      etfReturnPolicy: 'ETF-level returns',
    };
    for (const [field, expected] of Object.entries(constants)) {
      if (typeof method[field] !== typeof expected || method[field] !== expected) {
        addDiagnostic(diagnostics, {
          file, field: `methodology.${field}`, code: 'methodology-value',
          message: `Value must be ${JSON.stringify(expected)}.`,
        });
      }
    }
  }

  validateYears(object.coveredCalendarYears, 'coveredCalendarYears', file, diagnostics);
  const scope = object.assetScope;
  if (isObject(scope) && scope.mode === 'complete') {
    validateClosedObject(scope, 'assetScope', ['mode'], ['mode'], file, diagnostics);
  } else if (isObject(scope) && scope.mode === 'subset') {
    const subset = validateClosedObject(scope, 'assetScope', ['mode', 'symbols', 'rationale'],
      ['mode', 'symbols', 'rationale'], file, diagnostics);
    if (subset) {
      if (!Array.isArray(subset.symbols)) {
        addDiagnostic(diagnostics, {
          file, field: 'assetScope.symbols', code: 'symbols-type',
          message: 'Subset symbols must be a nonempty array of unique strings.',
        });
      } else {
        if (!subset.symbols.length) {
          addDiagnostic(diagnostics, {
            file, field: 'assetScope.symbols', code: 'symbols-empty',
            message: 'Subset must declare at least one symbol.',
          });
        }
        const seen = new Set();
        subset.symbols.forEach((symbol, index) => {
          const field = `assetScope.symbols[${index}]`;
          validateText(symbol, field, file, diagnostics);
          if (seen.has(symbol)) {
            addDiagnostic(diagnostics, {
              file, symbol, field, code: 'duplicate-symbol',
              message: 'Subset symbol is duplicated.',
            });
          }
          seen.add(symbol);
        });
      }
      validateText(subset.rationale, 'assetScope.rationale', file, diagnostics,
        { minLength: 12, rejectPlaceholder: true });
    }
  } else {
    addDiagnostic(diagnostics, {
      file, field: 'assetScope.mode', code: 'scope-mode',
      message: 'Scope must explicitly declare complete or subset mode.',
    });
    if (isObject(scope)) {
      for (const key of Object.keys(scope).sort(compareText)) {
        if (!['mode', 'symbols', 'rationale'].includes(key)) {
          addDiagnostic(diagnostics, {
            file, field: `assetScope.${key}`, code: 'unknown-property',
            message: 'Property is not allowed by the closed scope contract.',
          });
        }
      }
    }
  }

  validateText(object.reviewer, 'reviewer', file, diagnostics, { minLength: 3, rejectPlaceholder: true });
  if (typeof object.reviewDate !== 'string' || !isCalendarDate(object.reviewDate)) {
    addDiagnostic(diagnostics, {
      file, field: 'reviewDate', code: 'calendar-date',
      message: 'Review date must be a real calendar date in YYYY-MM-DD format.',
    });
  }

  if (!Array.isArray(object.exceptions)) {
    addDiagnostic(diagnostics, {
      file, field: 'exceptions', code: 'exceptions-type',
      message: 'Exceptions must be an array.',
    });
  } else {
    object.exceptions.forEach((exception, index) => validateException(exception, index, file, diagnostics));
  }
}

function isCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function validateSymbolArray(value, field, file, diagnostics, context = {}) {
  if (!Array.isArray(value)) {
    addDiagnostic(diagnostics, {
      ...context, file, field, code: 'symbols-type',
      message: 'Value must be a nonempty array of unique strings.',
    });
    return;
  }
  if (!value.length) {
    addDiagnostic(diagnostics, {
      ...context, file, field, code: 'symbols-empty',
      message: 'At least one symbol is required.',
    });
  }
  const seen = new Set();
  value.forEach((symbol, index) => {
    const itemField = `${field}[${index}]`;
    validateText(symbol, itemField, file, diagnostics, { context });
    if (seen.has(symbol)) {
      addDiagnostic(diagnostics, {
        ...context, file, symbol, field: itemField, code: 'duplicate-symbol',
        message: 'Symbol is duplicated.',
      });
    }
    seen.add(symbol);
  });
}

function validateException(exception, index, file, diagnostics) {
  const field = `exceptions[${index}]`;
  const object = validateClosedObject(
    exception,
    field,
    ['symbols', 'acceptedValueOrPolicy', 'rationale', 'evidence'],
    ['symbols', 'years', 'metadataField', 'acceptedValueOrPolicy', 'rationale', 'evidence'],
    file,
    diagnostics,
  );
  if (!object) return;
  validateSymbolArray(object.symbols, `${field}.symbols`, file, diagnostics);
  validateText(object.acceptedValueOrPolicy, `${field}.acceptedValueOrPolicy`, file, diagnostics,
    { rejectPlaceholder: true });
  validateText(object.rationale, `${field}.rationale`, file, diagnostics, { minLength: 12, rejectPlaceholder: true });
  validateText(object.evidence, `${field}.evidence`, file, diagnostics, { minLength: 12, rejectPlaceholder: true });
  if (!Object.hasOwn(object, 'years') && !Object.hasOwn(object, 'metadataField')) {
    addDiagnostic(diagnostics, {
      file, field, code: 'exception-target',
      message: 'Exception must declare years, metadataField, or both.',
    });
  }
  if (Object.hasOwn(object, 'years')) validateYears(object.years, `${field}.years`, file, diagnostics);
  if (Object.hasOwn(object, 'metadataField')) {
    validateText(object.metadataField, `${field}.metadataField`, file, diagnostics,
      { minLength: 3, rejectPlaceholder: true });
  }
}

function parseSourceRecords(pair, diagnostics) {
  if (!pair.sourceBytes) return [];
  const text = pair.sourceBytes.toString('utf8');
  if (pair.sourceFormat === 'csv') return parseCsv(text, pair.sourceFilename, diagnostics);
  if (pair.sourceFormat === 'json') {
    const source = parseJson(text, pair.sourceFilename, diagnostics);
    return validateJsonSource(source, pair.sourceFilename, diagnostics);
  }
  return [];
}

function parseCsv(text, file, diagnostics) {
  const parsed = Papa.parse(text, {
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
  });
  for (const error of parsed.errors) {
    addDiagnostic(diagnostics, {
      file,
      row: error.row + 1,
      field: 'csv',
      code: 'csv-syntax',
      message: `CSV parse error: ${error.message}`,
    });
  }
  const rows = [...parsed.data];
  if (/\r?\n$/.test(text) && rows.at(-1)?.every(field => field === '')) rows.pop();
  const header = rows[0];
  if (!header || header.length !== expectedHeader.length ||
      header.some((field, index) => field !== expectedHeader[index])) {
    addDiagnostic(diagnostics, {
      file, row: 1, field: 'header', code: 'csv-header',
      message: `Header must be exactly ${expectedHeader.join(',')}.`,
    });
  }
  const headerValid = header?.length === expectedHeader.length &&
    header.every((field, index) => field === expectedHeader[index]);
  const assets = new Map();
  for (const [index, row] of rows.slice(1).entries()) {
    const rowNumber = index + 2;
    if (!row.length || row.every(field => field === '')) {
      addDiagnostic(diagnostics, {
        file, row: rowNumber, field: 'record', code: 'csv-blank-row',
        message: 'Blank CSV records are not allowed.',
      });
      continue;
    }
    if (row.length !== expectedHeader.length) {
      addDiagnostic(diagnostics, {
        file, row: rowNumber, field: 'record', code: 'csv-column-count',
        message: `Record must contain exactly ${expectedHeader.length} fields; found ${row.length}.`,
      });
      continue;
    }
    if (!headerValid) continue;
    const [symbol, name, assetClass, yearText, returnText] = row;
    const context = { file, row: rowNumber, symbol, field: 'symbol' };
    validateSourceSymbol(symbol, context, diagnostics);
    validateSourceText(name, { ...context, field: 'name' }, diagnostics);
    if (!assetClasses.has(assetClass)) {
      addDiagnostic(diagnostics, {
        ...context, field: 'assetClass', code: 'asset-class',
        message: 'Asset class must be equity_index, equity_stock, bond, or commodity.',
      });
    }
    const year = /^\d{1,4}$/.test(yearText) ? Number(yearText) : NaN;
    if (!Number.isInteger(year) || year < 1 || year > 9999) {
      addDiagnostic(diagnostics, {
        ...context, year: Number.isFinite(year) ? year : undefined, field: 'year', code: 'year-format',
        message: 'Year must be an integer from 1 through 9999.',
      });
    }
    const numericSyntax = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(returnText);
    const value = numericSyntax ? Number(returnText) : NaN;
    if (!numericSyntax || !Number.isFinite(value)) {
      addDiagnostic(diagnostics, {
        ...context, year: Number.isFinite(year) ? year : undefined, field: 'return', code: 'return-number',
        message: 'Return must be a finite decimal number without trailing text or percent notation.',
      });
    } else {
      if (value < -1) {
        addDiagnostic(diagnostics, {
          ...context, year, field: 'return', code: 'return-lower-bound',
          message: 'Return cannot be below -1 (a total loss).',
        });
      }
      if ((returnText.split('.')[1]?.length ?? 0) > 4) {
        addDiagnostic(diagnostics, {
          ...context, year, field: 'return', code: 'return-precision',
          message: 'Return cannot exceed four decimal places.',
        });
      }
    }

    let asset = assets.get(symbol);
    if (!asset) {
      asset = { symbol, name, assetClass, returns: [], _record: rowNumber };
      assets.set(symbol, asset);
    } else {
      if (asset.name !== name) {
        addDiagnostic(diagnostics, {
          ...context, field: 'name', code: 'metadata-conflict',
          message: `Repeated records for ${JSON.stringify(symbol)} have conflicting names.`,
        });
      }
      if (asset.assetClass !== assetClass) {
        addDiagnostic(diagnostics, {
          ...context, field: 'assetClass', code: 'metadata-conflict',
          message: `Repeated records for ${JSON.stringify(symbol)} have conflicting asset classes.`,
        });
      }
    }
    if (Number.isInteger(year) && Number.isFinite(value)) asset.returns.push({ year, return: value, _row: rowNumber });
  }
  return [...assets.values()];
}

function validateSourceSymbol(symbol, context, diagnostics) {
  validateSourceText(symbol, context, diagnostics);
  if (typeof symbol === 'string' && symbol.trim() !== symbol) {
    addDiagnostic(diagnostics, {
      ...context, code: 'symbol-whitespace',
      message: 'Symbol cannot have surrounding whitespace; provide the exact reviewed symbol.',
    });
  }
}

function validateSourceText(value, context, diagnostics) {
  if (typeof value !== 'string' || value.length < 1 || !/\S/.test(value)) {
    addDiagnostic(diagnostics, {
      ...context, code: 'required-text',
      message: 'Value must be a nonblank string.',
    });
  }
}

function validateJsonSource(source, file, diagnostics) {
  const object = validateClosedObject(source, '', ['assets'], ['assets'], file, diagnostics);
  if (!object) return [];
  if (!Array.isArray(object.assets)) {
    addDiagnostic(diagnostics, {
      file, field: 'assets', code: 'assets-type',
      message: 'Assets must be an array.',
    });
    return [];
  }
  if (!object.assets.length) {
    addDiagnostic(diagnostics, {
      file, field: 'assets', code: 'assets-empty',
      message: 'At least one asset is required.',
    });
  }
  const assets = [];
  object.assets.forEach((assetValue, assetIndex) => {
    const field = `assets[${assetIndex}]`;
    const asset = validateClosedObject(assetValue, field, ['symbol', 'name', 'assetClass', 'returns'],
      ['symbol', 'name', 'assetClass', 'returns'], file, diagnostics);
    if (!asset) return;
    const symbol = asset.symbol;
    const context = { symbol: typeof symbol === 'string' ? symbol : undefined };
    validateSourceSymbol(symbol, { ...context, file, field: `${field}.symbol` }, diagnostics);
    validateSourceText(asset.name, { ...context, file, field: `${field}.name` }, diagnostics);
    if (typeof asset.assetClass !== 'string' || !assetClasses.has(asset.assetClass)) {
      addDiagnostic(diagnostics, {
        ...context, file, field: `${field}.assetClass`, code: 'asset-class',
        message: 'Asset class must be equity_index, equity_stock, bond, or commodity.',
      });
    }
    if (!Array.isArray(asset.returns)) {
      addDiagnostic(diagnostics, {
        ...context, file, field: `${field}.returns`, code: 'returns-type',
        message: 'Returns must be an array.',
      });
      return;
    }
    if (!asset.returns.length) {
      addDiagnostic(diagnostics, {
        ...context, file, field: `${field}.returns`, code: 'returns-empty',
        message: 'At least one annual return is required.',
      });
    }
    const returns = [];
    asset.returns.forEach((returnValue, returnIndex) => {
      const returnField = `${field}.returns[${returnIndex}]`;
      const item = validateClosedObject(returnValue, returnField, ['year', 'return'], ['year', 'return'],
        file, diagnostics, context);
      if (!item) return;
      const year = item.year;
      if (!Number.isInteger(year) || year < 1 || year > 9999) {
        addDiagnostic(diagnostics, {
          ...context, file, year: Number.isInteger(year) ? year : undefined,
          field: `${returnField}.year`, code: 'year-range',
          message: 'Year must be an integer from 1 through 9999.',
        });
      }
      const value = item.return;
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        addDiagnostic(diagnostics, {
          ...context, file, year, field: `${returnField}.return`, code: 'return-number',
          message: 'Return must be a finite JSON number.',
        });
      } else {
        if (value < -1) {
          addDiagnostic(diagnostics, {
            ...context, file, year, field: `${returnField}.return`, code: 'return-lower-bound',
            message: 'Return cannot be below -1 (a total loss).',
          });
        }
        if (!hasFourDecimalPlaces(value)) {
          addDiagnostic(diagnostics, {
            ...context, file, year, field: `${returnField}.return`, code: 'return-precision',
            message: 'Return must be a multiple of 0.0001.',
          });
        }
      }
      if (Number.isInteger(year) && Number.isFinite(value)) returns.push({ year, return: value, _row: returnIndex + 1 });
    });
    assets.push({
      symbol,
      name: asset.name,
      assetClass: asset.assetClass,
      returns,
      _record: assetIndex + 1,
    });
  });
  return assets;
}

function hasFourDecimalPlaces(value) {
  const scaled = value * 10000;
  return Number.isFinite(scaled) &&
    Math.abs(scaled - Math.round(scaled)) <= Number.EPSILON * Math.max(1, Math.abs(scaled)) * 8;
}

function collectDiagnostics(pair, assets, diagnostics) {
  const assetRecords = new Map();
  for (const asset of assets) {
    if (typeof asset.symbol === 'string') {
      const context = {
        file: pair.sourceFilename,
        row: asset._record,
        symbol: asset.symbol,
      };
      if (assetRecords.has(asset.symbol)) {
        addDiagnostic(diagnostics, {
          ...context, field: 'symbol', code: 'duplicate-symbol',
          message: 'Source contains more than one asset record for this symbol.',
        });
      } else {
        assetRecords.set(asset.symbol, asset);
      }
    }
    const seenYears = new Set();
    for (const item of asset.returns) {
      const context = {
        file: pair.sourceFilename,
        row: item._row,
        symbol: asset.symbol,
        year: item.year,
      };
      if (seenYears.has(item.year)) {
        addDiagnostic(diagnostics, {
          ...context, field: 'year', code: 'duplicate-period',
          message: 'Source contains a duplicate symbol/calendar-year record.',
        });
      }
      seenYears.add(item.year);
      if (item.year >= new Date().getUTCFullYear()) {
        addDiagnostic(diagnostics, {
          ...context, field: 'year', code: 'incomplete-calendar-year',
          message: 'Only completed calendar years before the current UTC year are accepted.',
        });
      }
      if (Number.isFinite(item.return) && (item.return < -0.9 || item.return > 3.0)) {
        addDiagnostic(diagnostics, {
          ...context, field: 'return',
          code: item.return < -0.9 ? 'outlier-low' : 'outlier-high',
          severity: 'warning',
          message: item.return < -0.9
            ? 'Return is below the existing -0.9 outlier-warning threshold.'
            : 'Return is above the existing 3.0 outlier-warning threshold.',
        });
      }
    }
  }

  const manifest = pair.manifest;
  if (manifest?.assetScope?.mode === 'subset') {
    if (Array.isArray(manifest.assetScope.symbols)) {
      const sourceSymbols = [...new Set(assets.map(asset => asset.symbol))].sort(compareText);
      const declaredSymbols = [...manifest.assetScope.symbols].sort(compareText);
      if (JSON.stringify(sourceSymbols) !== JSON.stringify(declaredSymbols)) {
        addDiagnostic(diagnostics, {
          file: pair.manifestFilename,
          field: 'assetScope.symbols',
          code: 'subset-symbol-mismatch',
          message: 'Declared subset symbols must exactly match source symbols.',
        });
      }
    }
    if (Array.isArray(manifest.coveredCalendarYears)) {
      const sourceYears = [...new Set(assets.flatMap(asset => asset.returns.map(item => item.year)))]
        .sort((left, right) => left - right);
      const declaredYears = [...manifest.coveredCalendarYears].sort((left, right) => left - right);
      if (JSON.stringify(sourceYears) !== JSON.stringify(declaredYears)) {
        addDiagnostic(diagnostics, {
          file: pair.manifestFilename,
          field: 'coveredCalendarYears',
          code: 'subset-years-mismatch',
          message: 'Declared covered years must exactly match source years.',
        });
      }
    }
  }
}

function sortDiagnostics(diagnostics) {
  const compareOptional = (left, right) => {
    if (left == null) return right == null ? 0 : -1;
    if (right == null) return 1;
    return typeof left === 'number' && typeof right === 'number'
      ? left - right
      : compareText(String(left), String(right));
  };
  return [...diagnostics].sort((left, right) =>
    compareText(left.file ?? '', right.file ?? '') ||
    compareOptional(left.row, right.row) ||
    compareOptional(left.symbol, right.symbol) ||
    compareOptional(left.year, right.year) ||
    compareText(left.field ?? '', right.field ?? '') ||
    compareText(left.code ?? '', right.code ?? '') ||
    compareText(left.severity ?? '', right.severity ?? ''));
}

function loadBaseline(filename) {
  return JSON.parse(readFileSync(path.join(presetDirectory, filename), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeReviewedAssets(sourceAssets, stocks, indices) {
  const candidates = { stocks: clone(stocks), indices: clone(indices) };
  for (const asset of sourceAssets) {
    const symbol = asset.symbol;
    const locations = [];
    if (Object.hasOwn(candidates.stocks, symbol)) locations.push(candidates.stocks);
    if (Object.hasOwn(candidates.indices, symbol)) locations.push(candidates.indices);
    if (!locations.length) throw new Error(`New symbol ${symbol} requires an explicit reviewed partition route.`);
    for (const partition of locations) {
      const current = partition[symbol];
      const byYear = new Map(current.returns.map(item => [Number(item.date), item.return]));
      for (const item of asset.returns) byYear.set(item.year, item.return);
      const years = [...byYear.keys()].sort((left, right) => left - right);
      partition[symbol] = {
        ...current,
        symbol,
        name: asset.name,
        assetClass: asset.assetClass,
        startDate: `${years[0]}-01-01`,
        endDate: `${years.at(-1)}-12-31`,
        returns: years.map(year => ({ date: String(year), return: byYear.get(year) })),
      };
    }
  }
  return candidates;
}

function compareCoverageAndBuildCandidates(sourceAssets, manifest, stocks, indices, diagnostics) {
  const baseline = new Map();
  for (const [filename, partition] of [['stocks.json', stocks], ['indices.json', indices]]) {
    for (const [symbol, asset] of Object.entries(partition)) {
      let record = baseline.get(symbol);
      if (!record) {
        record = { asset, partitions: [] };
        baseline.set(symbol, record);
      }
      record.partitions.push(filename);
    }
  }

  const sourceBySymbol = new Map(sourceAssets.map(asset => [asset.symbol, asset]));
  if (manifest.assetScope.mode === 'complete') {
    for (const [symbol, record] of baseline) {
      const sourceAsset = sourceBySymbol.get(symbol);
      const file = record.partitions.join(', ');
      if (!sourceAsset) {
        addDiagnostic(diagnostics, {
          file, symbol, field: 'symbol', code: 'removed-asset',
          message: 'Complete source omitted an asset present in the bundled baseline.',
        });
        continue;
      }

      const sourceYears = new Set(sourceAsset.returns.map(item => item.year));
      for (const item of record.asset.returns) {
        const year = Number(item.date);
        if (!sourceYears.has(year)) {
          addDiagnostic(diagnostics, {
            file, symbol, year, field: 'year', code: 'removed-period',
            message: 'Complete source omitted a previously covered bundled period.',
          });
        }
      }
    }
  }

  return mergeReviewedAssets(sourceAssets, stocks, indices);
}

function orderedJson(value) {
  return `${JSON.stringify(Object.fromEntries(Object.keys(value).sort(compareText).map(key => [key, value[key]])), null, 2)}\n`;
}

function markdownCell(value) {
  if (value === undefined || value === null || value === '') return '-';
  return String(value).replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
}

function renderDiagnostics(diagnostics, severity) {
  const selected = diagnostics.filter(item => item.severity === severity);
  if (!selected.length) return ['None.'];
  return [
    '| File | Row | Symbol | Year | Field | Code | Message |',
    '|---|---:|---|---:|---|---|---|',
    ...selected.map(item => `| ${[
      item.file,
      item.row,
      item.symbol,
      item.year,
      item.field,
      item.code,
      item.message,
    ].map(markdownCell).join(' | ')} |`),
  ];
}

function renderReport(pair, assets, stocks, indices, diagnostics) {
  const manifest = pair.manifest ?? {};
  const symbols = assets.map(asset => asset.symbol).filter(value => typeof value === 'string').sort(compareText);
  const years = [...new Set(assets.flatMap(asset => asset.returns.map(item => item.year)))]
    .sort((left, right) => left - right);
  const changes = [];
  if (stocks && indices) {
    for (const asset of [...assets].sort((left, right) => compareText(left.symbol, right.symbol))) {
      const baseline = stocks[asset.symbol] ?? indices[asset.symbol];
      if (!baseline) continue;
      for (const field of ['name', 'assetClass']) {
        if (baseline[field] !== asset[field]) {
          changes.push(`- Changed metadata: ${asset.symbol}/${field} (${JSON.stringify(baseline[field])} → ${JSON.stringify(asset[field])})`);
        }
      }
      const existingReturns = new Map(baseline.returns.map(item => [Number(item.date), item.return]));
      for (const item of [...asset.returns].sort((left, right) => left.year - right.year)) {
        if (!existingReturns.has(item.year)) {
          changes.push(`- Added: ${asset.symbol}/${item.year} (${item.return})`);
        } else if (existingReturns.get(item.year) !== item.return) {
          changes.push(`- Changed: ${asset.symbol}/${item.year} (${existingReturns.get(item.year)} → ${item.return})`);
        }
      }
    }
  }
  return [
    '# Historical Return Dry-Run Report',
    '',
    '## Reviewed input',
    '',
    `- Source: \`${markdownCell(pair.sourceFilename)}\` (${markdownCell(pair.sourceFormat)})`,
    `- SHA-256: \`${markdownCell(manifest.snapshotSha256)}\``,
    `- Attribution: ${markdownCell(manifest.sourceAttribution)}`,
    `- Reviewer: ${markdownCell(manifest.reviewer)}`,
    `- Review date: ${markdownCell(manifest.reviewDate)}`,
    `- Methodology: ${markdownCell(manifest.methodology?.returnConvention ?? 'unavailable')}`,
    `- Scope: ${markdownCell(manifest.assetScope?.mode ?? 'unavailable')}${manifest.assetScope?.mode === 'subset' ? ` — ${markdownCell(manifest.assetScope.rationale)}` : ''}`,
    `- Symbols: ${symbols.map(markdownCell).join(', ') || '-'}`,
    `- Covered years: ${years.join(', ') || '-'}`,
    '',
    '## Blocking errors',
    '',
    ...renderDiagnostics(diagnostics, 'blocking'),
    '',
    '## Warnings',
    '',
    ...renderDiagnostics(diagnostics, 'warning'),
    '',
    '## Changes',
    '',
    ...(changes.length ? changes : ['No changes detected for the reviewed periods.']),
    '',
  ].join('\n');
}

function assertOutputDirectory(outputPath) {
  const presets = realpathSync(presetDirectory);
  const absoluteOutput = path.resolve(outputPath);
  let ancestor = absoluteOutput;
  const missing = [];
  while (!existsSync(ancestor)) {
    missing.unshift(path.basename(ancestor));
    ancestor = path.dirname(ancestor);
  }
  const physicalOutput = path.join(realpathSync(ancestor), ...missing);
  const relative = path.relative(presets, physicalOutput);
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Output directory must be outside src/data/presets.');
  }
  mkdirSync(absoluteOutput, { recursive: true });
  if (readdirSync(absoluteOutput).length) {
    throw new Error('Output directory must be absent or empty.');
  }
}

function writeReport(outputPath, report) {
  const filename = path.join(outputPath, 'dry-run-report.md');
  const fd = openSync(filename, 'wx');
  try {
    writeFileSync(fd, report, 'utf8');
  } finally {
    closeSync(fd);
  }
}

function writeOutputs(outputPath, candidates, report) {
  const files = new Map([
    ['stocks.json', orderedJson(candidates.stocks)],
    ['indices.json', orderedJson(candidates.indices)],
    ['dry-run-report.md', report],
  ]);
  for (const [name, contents] of files) {
    const filename = path.join(outputPath, name);
    const fd = openSync(filename, 'wx');
    try {
      writeFileSync(fd, contents, 'utf8');
    } finally {
      closeSync(fd);
    }
  }
}

function main(args) {
  const options = parseArguments(args);
  assertOutputDirectory(options['--output-dir']);
  const diagnostics = [];
  const pair = readReviewedPair(options, diagnostics);
  const assets = parseSourceRecords(pair, diagnostics);
  validateManifest(pair.manifest, pair.manifestFilename, diagnostics);
  collectDiagnostics(pair, assets, diagnostics);
  let stocks = null;
  let indices = null;
  let candidates = null;
  if (!diagnostics.some(item => item.severity === 'blocking')) {
    stocks = loadBaseline('stocks.json');
    indices = loadBaseline('indices.json');
    candidates = compareCoverageAndBuildCandidates(
      assets, pair.manifest, stocks, indices, diagnostics,
    );
  }
  const sortedDiagnostics = sortDiagnostics(diagnostics);
  const blockingCount = sortedDiagnostics.filter(item => item.severity === 'blocking').length;
  if (blockingCount) {
    writeReport(options['--output-dir'], renderReport(pair, assets, stocks, indices, sortedDiagnostics));
    console.error(`refresh:dry-run: blocked by ${blockingCount} validation error(s). Report: dry-run-report.md`);
    process.exitCode = 1;
    return;
  }

  const report = renderReport(pair, assets, stocks, indices, sortedDiagnostics);
  writeOutputs(options['--output-dir'], candidates, report);
  console.log([
    'Dry run completed successfully.',
    `stocks.json: ${path.join(options['--output-dir'], 'stocks.json')}`,
    `indices.json: ${path.join(options['--output-dir'], 'indices.json')}`,
    `dry-run-report.md: ${path.join(options['--output-dir'], 'dry-run-report.md')}`,
  ].join('\n'));
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`refresh:dry-run: ${error.message}`);
  process.exitCode = 1;
}
