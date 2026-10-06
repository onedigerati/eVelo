import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

const schemaUrl = name => new URL(`../../../docs/maintenance/historical-returns/schemas/${name}.schema.json`, import.meta.url);
const sourceSchema = JSON.parse(readFileSync(schemaUrl('annual-return-source'), 'utf8'));
const manifestSchema = JSON.parse(readFileSync(schemaUrl('annual-return-review-manifest'), 'utf8'));
const ajv = new Ajv2020({
  strict: true, validateFormats: true, allErrors: true,
  coerceTypes: false, useDefaults: false, removeAdditional: false,
  // Decimal multiples need tolerance for binary floating-point representation.
  multipleOfPrecision: 8,
});
ajv.addFormat('date', {
  type: 'string',
  validate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1) return false;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  },
});
const validateSource = ajv.compile(sourceSchema);
const validateManifest = ajv.compile(manifestSchema);
const source = {
  assets: [{
    symbol: 'TEST', name: 'Reviewed test stock', assetClass: 'equity_stock',
    returns: [{ year: 2024, return: -0.1004 }, { year: 2025, return: 0.0218 }],
  }],
};
const manifest = {
  sourceAttribution: 'Reviewed Example Provider annual-return snapshot, archive record 2026-01',
  snapshotFilename: 'reviewed.csv',
  snapshotSha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  methodology: {
    returnConvention: 'calendar-year total returns', dividendsReinvested: true,
    endpoints: 'last-trading-day to last-trading-day', units: 'decimal',
    decimalPlaces: 4, etfReturnPolicy: 'ETF-level returns',
  },
  coveredCalendarYears: [2024, 2025],
  assetScope: { mode: 'complete' },
  reviewer: 'Example Maintainer',
  reviewDate: '2026-01-02',
  exceptions: [],
};
const subset = { mode: 'subset', symbols: ['TEST'], rationale: 'Explicitly reviewed one-symbol scope' };
const yearException = {
  symbols: ['TEST'], years: [2024], acceptedValueOrPolicy: '-0.1004',
  rationale: 'Approved dividend adjustment in selected source',
  evidence: 'reviewed.csv row 2; adjacent review notes section 3',
};
const metadataException = {
  symbols: ['TEST'], metadataField: 'name', acceptedValueOrPolicy: 'Reviewed test stock',
  rationale: 'Explicit display label accepted by snapshot reviewer',
  evidence: 'reviewed.csv name column; adjacent review notes section 4',
};

function resolve(root, node) {
  if (!node.$ref) return node;
  assert.match(node.$ref, /^#\//, 'only local references in contract');
  return resolve(root, node.$ref.slice(2).split('/').reduce((value, key) => value[key], root));
}

function property(root, object, name, type) {
  const parent = resolve(root, object);
  assert(parent.properties && Object.hasOwn(parent.properties, name), `missing property definition: ${name}`);
  const result = resolve(root, parent.properties[name]);
  if (type) assert.equal(result.type, type, `${name} type`);
  return result;
}

function required(object, names) {
  assert.deepEqual([...object.required].sort(), [...names].sort());
  assert.equal(object.type, 'object');
  assert.equal(object.additionalProperties, false);
}

function textDefinition(node) {
  assert.equal(node.type, 'string');
  assert(node.minLength >= 1);
  assert.equal(node.pattern, '\\S');
}

function yearsDefinition(node) {
  assert.equal(node.type, 'array');
  assert.equal(node.minItems, 1);
  assert.equal(node.uniqueItems, true);
  assert.equal(node.items.type, 'integer');
  assert.equal(node.items.minimum, 1);
  assert.equal(node.items.maximum, 9999);
}

test('source required fields have resolved definitions, constraints and closed shapes', () => {
  assert.equal(sourceSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  required(sourceSchema, ['assets']);
  const assets = property(sourceSchema, sourceSchema, 'assets', 'array');
  assert.equal(assets.minItems, 1);
  const asset = resolve(sourceSchema, assets.items);
  required(asset, ['symbol', 'name', 'assetClass', 'returns']);
  for (const key of ['symbol', 'name']) textDefinition(property(sourceSchema, asset, key, 'string'));
  const assetClass = property(sourceSchema, asset, 'assetClass', 'string');
  assert.deepEqual(assetClass.enum, ['equity_index', 'equity_stock', 'bond', 'commodity']);
  const returns = property(sourceSchema, asset, 'returns', 'array');
  assert.equal(returns.minItems, 1);
  const annualReturn = resolve(sourceSchema, returns.items);
  required(annualReturn, ['year', 'return']);
  const year = property(sourceSchema, annualReturn, 'year', 'integer');
  assert.equal(year.minimum, 1);
  assert.equal(year.maximum, 9999);
  const annualValue = property(sourceSchema, annualReturn, 'return', 'number');
  assert.equal(annualValue.minimum, -1);
  assert.equal(annualValue.multipleOf, 0.0001);
});

test('all nine manifest fields, methodology, scope and exception definitions are constrained', () => {
  assert.equal(manifestSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  required(manifestSchema, ['sourceAttribution', 'snapshotFilename', 'snapshotSha256', 'methodology',
    'coveredCalendarYears', 'assetScope', 'reviewer', 'reviewDate', 'exceptions']);
  const attribution = property(manifestSchema, manifestSchema, 'sourceAttribution', 'string');
  const reviewer = property(manifestSchema, manifestSchema, 'reviewer', 'string');
  assert.equal(attribution.minLength, 12);
  assert.equal(reviewer.minLength, 3);
  assert(attribution.not.pattern);
  assert(reviewer.not.pattern);
  const filename = property(manifestSchema, manifestSchema, 'snapshotFilename', 'string');
  assert.equal(filename.minLength, 1);
  assert.equal(filename.pattern, '^[^/\\\\\\r\\n]+\\.(csv|json)$');
  const newPartitions = property(manifestSchema, manifestSchema, 'newSymbolPartitions', 'object');
  assert.equal(newPartitions.additionalProperties.type, 'string');
  assert.deepEqual(newPartitions.additionalProperties.enum, ['stocks.json', 'indices.json']);
  assert.equal(newPartitions.propertyNames.type, 'string');
  assert.equal(newPartitions.propertyNames.minLength, 1);
  assert.equal(newPartitions.propertyNames.pattern, '^\\S(?:[\\s\\S]*\\S)?$');
  assert(!manifestSchema.required.includes('newSymbolPartitions'));
  const sha = property(manifestSchema, manifestSchema, 'snapshotSha256', 'string');
  assert.equal(sha.pattern, '^[0-9a-f]{64}$');
  assert.equal(sha.minLength, 64);
  assert.equal(sha.maxLength, 64);
  assert.equal(property(manifestSchema, manifestSchema, 'reviewDate', 'string').format, 'date');
  yearsDefinition(property(manifestSchema, manifestSchema, 'coveredCalendarYears', 'array'));
  const method = property(manifestSchema, manifestSchema, 'methodology', 'object');
  required(method, ['returnConvention', 'dividendsReinvested', 'endpoints', 'units', 'decimalPlaces', 'etfReturnPolicy']);
  for (const [key, type, value] of [
    ['returnConvention', 'string', 'calendar-year total returns'],
    ['dividendsReinvested', 'boolean', true],
    ['endpoints', 'string', 'last-trading-day to last-trading-day'],
    ['units', 'string', 'decimal'], ['decimalPlaces', 'integer', 4],
    ['etfReturnPolicy', 'string', 'ETF-level returns'],
  ]) assert.equal(property(manifestSchema, method, key, type).const, value);
  const scope = property(manifestSchema, manifestSchema, 'assetScope');
  assert.equal(scope.oneOf.length, 2);
  const [complete, declaredSubset] = scope.oneOf.map(node => resolve(manifestSchema, node));
  required(complete, ['mode']);
  assert.equal(property(manifestSchema, complete, 'mode', 'string').const, 'complete');
  assert.equal(property(manifestSchema, complete, 'mode').default, 'complete');
  required(declaredSubset, ['mode', 'symbols', 'rationale']);
  assert.equal(property(manifestSchema, declaredSubset, 'mode', 'string').const, 'subset');
  const symbols = property(manifestSchema, declaredSubset, 'symbols', 'array');
  assert.equal(symbols.minItems, 1);
  assert.equal(symbols.uniqueItems, true);
  textDefinition(resolve(manifestSchema, symbols.items));
  const subsetRationale = property(manifestSchema, declaredSubset, 'rationale', 'string');
  assert.equal(subsetRationale.minLength, 12);
  assert(subsetRationale.not.pattern);
  const exceptions = property(manifestSchema, manifestSchema, 'exceptions', 'array');
  const exception = resolve(manifestSchema, exceptions.items);
  required(exception, ['symbols', 'acceptedValueOrPolicy', 'rationale', 'evidence']);
  assert.deepEqual(exception.anyOf.map(branch => branch.required), [['years'], ['metadataField']]);
  yearsDefinition(property(manifestSchema, exception.anyOf[0], 'years', 'array'));
  const metadataField = property(manifestSchema, exception.anyOf[1], 'metadataField', 'string');
  assert.equal(metadataField.minLength, 3);
  assert(metadataField.not.pattern);
  assert.deepEqual(property(manifestSchema, exception, 'symbols', 'array'), symbols);
  yearsDefinition(property(manifestSchema, exception, 'years', 'array'));
  const acceptedValue = property(manifestSchema, exception, 'acceptedValueOrPolicy', 'string');
  const rationale = property(manifestSchema, exception, 'rationale', 'string');
  const evidence = property(manifestSchema, exception, 'evidence', 'string');
  assert.equal(acceptedValue.minLength, 1);
  assert(acceptedValue.not.pattern);
  assert.equal(rationale.minLength, 12);
  assert(evidence.minLength >= 12);
  assert(rationale.not.pattern);
  assert(evidence.not.pattern);
});

function expectFixture(name, validator, value, expected) {
  test(name, () => {
    const before = structuredClone(value);
    assert.equal(validator(value), expected, `${name}: ${JSON.stringify(validator.errors)}`);
    assert.deepEqual(value, before, 'validation must not coerce, default or remove fields');
  });
}

function mutation(name, validator, base, keys, value, remove = false) {
  assert(validator(base), `${name} requires a valid baseline: ${JSON.stringify(validator.errors)}`);
  const fixture = structuredClone(base);
  const parent = keys.slice(0, -1).reduce((object, key) => object[key], fixture);
  if (remove) delete parent[keys.at(-1)];
  else parent[keys.at(-1)] = value;
  expectFixture(name, validator, fixture, false);
}

expectFixture('valid explicit JSON source with decimal returns', validateSource, source, true);
for (const assetClass of ['equity_index', 'equity_stock', 'bond', 'commodity']) {
  const fixture = structuredClone(source);
  fixture.assets[0].assetClass = assetClass;
  expectFixture(`valid ${assetClass} source`, validateSource, fixture, true);
}
for (const value of [-1, 0, 0.1, -0.1004, 0.0218, 0.1681, 0.0588, 9.6639]) {
  const fixture = structuredClone(source);
  fixture.assets[0].returns[0].return = value;
  expectFixture(`valid four-place decimal ${value}`, validateSource, fixture, true);
}
expectFixture('valid complete manifest with empty exceptions', validateManifest, manifest, true);
expectFixture('valid explicit subset manifest', validateManifest, { ...manifest, assetScope: subset }, true);
expectFixture('valid manifest with reviewed new-symbol partition', validateManifest,
  { ...manifest, newSymbolPartitions: { NEW: 'stocks.json' } }, true);
for (const [label, routeMap] of [
  ['wrong partition', { NEW: 'funds.json' }],
  ['blank symbol key', { ' ': 'stocks.json' }],
  ['padded symbol key', { ' NEW ': 'stocks.json' }],
  ['wrong route type', { NEW: true }],
  ['non-object map', ['stocks.json']],
]) {
  expectFixture(`invalid new-symbol partition map: ${label}`, validateManifest,
    { ...manifest, newSymbolPartitions: routeMap }, false);
}
expectFixture('valid zero-valued exception', validateManifest,
  { ...manifest, exceptions: [{ ...yearException, acceptedValueOrPolicy: '0' }] }, true);
expectFixture('valid fully evidenced year and metadata exceptions', validateManifest,
  { ...manifest, exceptions: [yearException, metadataException] }, true);
expectFixture('valid leap-day review', validateManifest, { ...manifest, reviewDate: '2024-02-29' }, true);
expectFixture('valid JSON snapshot filename', validateManifest, { ...manifest, snapshotFilename: 'reviewed.json' }, true);

const sourceFields = [
  [['assets'], {}],
  [['assets', 0, 'symbol'], 3],
  [['assets', 0, 'name'], []],
  [['assets', 0, 'assetClass'], false],
  [['assets', 0, 'returns'], {}],
  [['assets', 0, 'returns', 0, 'year'], '2024'],
  [['assets', 0, 'returns', 0, 'return'], '0.0218'],
];
for (const [keys, wrongType] of sourceFields) {
  mutation(`missing source ${keys.join('.')}`, validateSource, source, keys, null, true);
  mutation(`wrong-type source ${keys.join('.')}`, validateSource, source, keys, wrongType);
}
for (const [name, keys, value] of [
  ['empty assets', ['assets'], []],
  ['empty returns', ['assets', 0, 'returns'], []],
  ['empty symbol', ['assets', 0, 'symbol'], ''],
  ['blank symbol', ['assets', 0, 'symbol'], ' \t'],
  ['empty name', ['assets', 0, 'name'], ''],
  ['blank name', ['assets', 0, 'name'], ' '],
  ['unsupported asset class', ['assets', 0, 'assetClass'], 'equity'],
  ['fractional year', ['assets', 0, 'returns', 0, 'year'], 2024.5],
  ['zero year', ['assets', 0, 'returns', 0, 'year'], 0],
  ['out-of-range year', ['assets', 0, 'returns', 0, 'year'], 10000],
  ['five-place return', ['assets', 0, 'returns', 0, 'return'], 0.02181],
  ['return below total loss', ['assets', 0, 'returns', 0, 'return'], -1.0001],
  ['nonfinite return', ['assets', 0, 'returns', 0, 'return'], Infinity],
  ['NaN return', ['assets', 0, 'returns', 0, 'return'], NaN],
  ['unknown source key', ['extra'], true],
  ['unknown asset key', ['assets', 0, 'extra'], true],
  ['unknown return key', ['assets', 0, 'returns', 0, 'date'], '2024'],
]) mutation(name, validateSource, source, keys, value);

for (const [key, wrongType] of [
  ['sourceAttribution', 5], ['snapshotFilename', []], ['snapshotSha256', 12],
  ['methodology', 'total return'], ['coveredCalendarYears', {}], ['assetScope', 'complete'],
  ['reviewer', false], ['reviewDate', 20260102], ['exceptions', {}],
]) {
  mutation(`missing manifest ${key}`, validateManifest, manifest, [key], null, true);
  mutation(`wrong-type manifest ${key}`, validateManifest, manifest, [key], wrongType);
}
for (const [key, wrongType] of [
  ['returnConvention', 3], ['dividendsReinvested', 'true'], ['endpoints', false],
  ['units', {}], ['decimalPlaces', '4'], ['etfReturnPolicy', []],
]) {
  mutation(`missing methodology ${key}`, validateManifest, manifest, ['methodology', key], null, true);
  mutation(`wrong-type methodology ${key}`, validateManifest, manifest, ['methodology', key], wrongType);
}
for (const [key, wrongValue] of [
  ['returnConvention', 'price returns'], ['dividendsReinvested', false],
  ['endpoints', 'first-trading-day to last-trading-day'], ['units', 'percent'],
  ['decimalPlaces', 5], ['etfReturnPolicy', 'index total returns'],
]) mutation(`wrong methodology policy ${key}`, validateManifest, manifest, ['methodology', key], wrongValue);
for (const [name, keys, value] of [
  ['empty attribution', ['sourceAttribution'], ''],
  ['blank attribution', ['sourceAttribution'], ' '],
  ['empty snapshot filename', ['snapshotFilename'], ''],
  ['filename includes path', ['snapshotFilename'], '../reviewed.csv'],
  ['unsupported filename extension', ['snapshotFilename'], 'reviewed.txt'],
  ['empty reviewer', ['reviewer'], ''],
  ['blank reviewer', ['reviewer'], ' \n'],
  ['uppercase digest', ['snapshotSha256'], 'A'.repeat(64)],
  ['nonhex digest', ['snapshotSha256'], 'z'.repeat(64)],
  ['63-character digest', ['snapshotSha256'], 'a'.repeat(63)],
  ['65-character digest', ['snapshotSha256'], 'a'.repeat(65)],
  ['empty covered years', ['coveredCalendarYears'], []],
  ['duplicate covered years', ['coveredCalendarYears'], [2024, 2024]],
  ['fractional covered year', ['coveredCalendarYears'], [2024.5]],
  ['string covered year', ['coveredCalendarYears'], ['2024']],
  ['zero covered year', ['coveredCalendarYears'], [0]],
  ['unsupported scope mode', ['assetScope', 'mode'], 'automatic'],
  ['wrong-type scope mode', ['assetScope', 'mode'], 3],
  ['unknown manifest key', ['extra'], true],
  ['unknown methodology key', ['methodology', 'extra'], true],
  ['unknown complete-scope key', ['assetScope', 'extra'], true],
  ['complete cannot silently declare symbols', ['assetScope', 'symbols'], ['TEST']],
]) mutation(name, validateManifest, manifest, keys, value);
for (const [field, value] of [
  [['sourceAttribution'], 'TBD'],
  [['sourceAttribution'], 'x'],
  [['reviewer'], 'unknown'],
  [['reviewer'], 'x'],
]) mutation(`manifest placeholder ${field.join('.')}: ${value}`, validateManifest, manifest, field, value);
for (const value of ['TBD', ' x ', 'N/A', 'unknown', '?']) {
  mutation(`placeholder exception rationale: ${value}`, validateManifest,
    { ...manifest, exceptions: [yearException] }, ['exceptions', 0, 'rationale'], value);
  mutation(`placeholder exception evidence: ${value}`, validateManifest,
    { ...manifest, exceptions: [yearException] }, ['exceptions', 0, 'evidence'], value);
}
for (const date of ['', '2026-1-02', '2026-01-02T00:00:00Z', '2026-02-29',
  '2024-02-30', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '0000-01-01']) {
  mutation(`invalid calendar date ${JSON.stringify(date)}`, validateManifest, manifest, ['reviewDate'], date);
}
mutation('complete mode is required despite its policy default', validateManifest, manifest, ['assetScope', 'mode'], null, true);
const subsetManifest = { ...manifest, assetScope: subset };
for (const [key, wrongType] of [['mode', 3], ['symbols', 'TEST'], ['rationale', false]]) {
  mutation(`missing subset ${key}`, validateManifest, subsetManifest, ['assetScope', key], null, true);
  mutation(`wrong-type subset ${key}`, validateManifest, subsetManifest, ['assetScope', key], wrongType);
}
for (const [name, key, value] of [
  ['empty subset symbols', 'symbols', []], ['duplicate subset symbols', 'symbols', ['TEST', 'TEST']],
  ['empty subset symbol', 'symbols', ['']], ['blank subset symbol', 'symbols', [' ']],
  ['wrong-type subset symbol', 'symbols', [3]], ['empty subset rationale', 'rationale', ''],
  ['blank subset rationale', 'rationale', ' \n'], ['unknown subset key', 'extra', true],
]) mutation(name, validateManifest, subsetManifest, ['assetScope', key], value);
for (const [label, exception] of [['year', yearException], ['metadata', metadataException]]) {
  const fixture = { ...manifest, exceptions: [exception] };
  for (const [key, wrongType] of [
    ['symbols', 'TEST'], ['acceptedValueOrPolicy', 0.0588], ['rationale', {}], ['evidence', []],
    [label === 'year' ? 'years' : 'metadataField', label === 'year' ? '2024' : 3],
  ]) {
    mutation(`missing ${label} exception ${key}`, validateManifest, fixture, ['exceptions', 0, key], null, true);
    mutation(`wrong-type ${label} exception ${key}`, validateManifest, fixture, ['exceptions', 0, key], wrongType);
  }
  for (const key of ['acceptedValueOrPolicy', 'rationale', 'evidence']) {
    for (const value of ['', ' \t']) {
      mutation(`empty/blank ${label} exception ${key} ${JSON.stringify(value)}`, validateManifest, fixture, ['exceptions', 0, key], value);
    }
  }
  for (const [name, key, value] of [
    ['empty affected symbols', 'symbols', []], ['blank affected symbol', 'symbols', [' ']],
    ['wrong-type affected symbol', 'symbols', [3]], ['duplicate affected symbols', 'symbols', ['TEST', 'TEST']],
    ['unknown exception key', 'extra', true],
  ]) mutation(`${label} exception ${name}`, validateManifest, fixture, ['exceptions', 0, key], value);
}
for (const value of [[], [2024, 2024], [2024.5], ['2024'], [0]]) {
  mutation(`invalid exception years ${JSON.stringify(value)}`, validateManifest,
    { ...manifest, exceptions: [yearException] }, ['exceptions', 0, 'years'], value);
}
for (const value of ['', ' ']) {
  mutation(`blank metadata target ${JSON.stringify(value)}`, validateManifest,
    { ...manifest, exceptions: [metadataException] }, ['exceptions', 0, 'metadataField'], value);
}
