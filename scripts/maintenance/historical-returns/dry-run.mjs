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
const outputNames = ['stocks.json', 'indices.json', 'dry-run-report.md'];
const expectedHeader = ['symbol', 'name', 'assetClass', 'year', 'return'];
const usage = 'Usage: npm run refresh:dry-run -- --source SOURCE_PATH --manifest MANIFEST_PATH --output-dir OUTPUT_DIR';

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

function assertNoDuplicateJsonKeys(text) {
  let index = 0;

  function whitespace() {
    while (/\s/.test(text[index] ?? '') && index < text.length) index++;
  }

  function string() {
    const start = index++;
    while (index < text.length) {
      const character = text[index++];
      if (character === '"') return JSON.parse(text.slice(start, index));
      if (character === '\\') index++;
    }
    throw new Error('Invalid JSON string.');
  }

  function object() {
    index++;
    whitespace();
    const keys = new Set();
    if (text[index] === '}') {
      index++;
      return;
    }
    while (index < text.length) {
      whitespace();
      if (text[index] !== '"') throw new Error('Invalid JSON object key.');
      const key = string();
      if (keys.has(key)) throw new Error(`Duplicate JSON object key: ${JSON.stringify(key)}.`);
      keys.add(key);
      whitespace();
      if (text[index++] !== ':') throw new Error('Invalid JSON object member.');
      value();
      whitespace();
      if (text[index] === '}') {
        index++;
        return;
      }
      if (text[index++] !== ',') throw new Error('Invalid JSON object separator.');
    }
    throw new Error('Unterminated JSON object.');
  }

  function array() {
    index++;
    whitespace();
    if (text[index] === ']') {
      index++;
      return;
    }
    while (index < text.length) {
      value();
      whitespace();
      if (text[index] === ']') {
        index++;
        return;
      }
      if (text[index++] !== ',') throw new Error('Invalid JSON array separator.');
    }
    throw new Error('Unterminated JSON array.');
  }

  function value() {
    whitespace();
    if (text[index] === '{') return object();
    if (text[index] === '[') return array();
    if (text[index] === '"') {
      string();
      return;
    }
    while (index < text.length && !/[\s,}\]]/.test(text[index])) index++;
  }

  value();
  whitespace();
  if (index !== text.length) throw new Error('Unexpected content after JSON value.');
}

function parseJson(text, label) {
  try {
    assertNoDuplicateJsonKeys(text);
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`, { cause: error });
  }
}

function readReviewedPair(options) {
  const { '--source': sourcePath, '--manifest': manifestPath } = options;
  const extension = path.extname(sourcePath);
  if (extension !== '.csv' && extension !== '.json') {
    throw new Error(`Unsupported source extension: ${extension || '(none)'}. Select .csv or .json.`);
  }
  if (manifestPath !== `${sourcePath}.manifest.json`) {
    throw new Error(`Manifest must be adjacent to the source and named ${path.basename(sourcePath)}.manifest.json.`);
  }

  let sourceBytes;
  let manifestBytes;
  let sourceRealPath;
  let manifestRealPath;
  try {
    sourceBytes = readFileSync(sourcePath);
    sourceRealPath = realpathSync(sourcePath);
  } catch (error) {
    throw new Error(`Cannot read source ${sourcePath}: ${error.message}`, { cause: error });
  }
  try {
    manifestBytes = readFileSync(manifestPath);
    manifestRealPath = realpathSync(manifestPath);
  } catch (error) {
    throw new Error(`Cannot read manifest ${manifestPath}: ${error.message}`, { cause: error });
  }
  if (manifestRealPath !== `${sourceRealPath}.manifest.json`) {
    throw new Error('Resolved source and manifest must form an adjacent pair.');
  }

  const sourceFilename = path.basename(sourcePath);
  const manifest = parseJson(manifestBytes.toString('utf8'), `Manifest ${manifestPath}`);
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error(`Manifest ${manifestPath} must be a JSON object.`);
  }
  const calculatedSnapshotSha256 = createHash('sha256').update(sourceBytes).digest('hex');
  if (manifest.snapshotFilename !== sourceFilename) {
    throw new Error(`Manifest snapshotFilename mismatch: expected ${JSON.stringify(sourceFilename)}.`);
  }
  if (manifest.snapshotSha256 !== calculatedSnapshotSha256) {
    throw new Error('Manifest snapshot SHA-256 does not match the selected source bytes.');
  }
  return {
    sourcePath,
    sourceFilename,
    sourceFormat: extension.slice(1),
    sourceBytes,
    manifest,
  };
}

function parseCsv(text) {
  const parsed = Papa.parse(text, {
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
  });
  if (parsed.errors.length) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse error at row ${first.row + 1}: ${first.message}.`);
  }
  const parsedRows = [...parsed.data];
  if (/\r?\n$/.test(text) && parsedRows.at(-1)?.every(field => field === '')) parsedRows.pop();
  const [header, ...rows] = parsedRows;
  if (!header || header.length !== expectedHeader.length ||
      header.some((field, index) => field !== expectedHeader[index])) {
    throw new Error(`CSV header must be exactly ${expectedHeader.join(',')}.`);
  }
  const assets = new Map();
  for (const [index, row] of rows.entries()) {
    if (row.length !== expectedHeader.length || row.every(field => field === '')) {
      throw new Error(`CSV row ${index + 2} must contain exactly five nonempty fields.`);
    }
    const [symbol, name, assetClass, yearText, returnText] = row;
    const year = Number(yearText);
    const value = Number(returnText);
    const decimalPlaces = returnText.split('.')[1]?.length ?? 0;
    if (!symbol.trim() || !name.trim() || !assetClass.trim() ||
        !/^[1-9]\d{0,3}$/.test(yearText) ||
        !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(returnText) ||
        !Number.isInteger(year) || year > 9999 ||
        !Number.isFinite(value) || value < -1 || decimalPlaces > 4) {
      throw new Error(`CSV row ${index + 2} has invalid required metadata, year, or return.`);
    }
    const asset = assets.get(symbol) ?? { symbol, name, assetClass, returns: [] };
    if (asset.name !== name || asset.assetClass !== assetClass) {
      throw new Error(`CSV row ${index + 2} conflicts with repeated metadata for ${symbol}.`);
    }
    if (asset.returns.some(item => item.year === year)) {
      throw new Error(`CSV row ${index + 2} duplicates ${symbol}/${year}.`);
    }
    asset.returns.push({ year, return: value });
    assets.set(symbol, asset);
  }
  if (!assets.size) throw new Error('CSV source must contain at least one annual-return record.');
  return [...assets.values()];
}

function parseSource(pair) {
  if (pair.sourceFormat === 'csv') return parseCsv(pair.sourceBytes.toString('utf8'));
  const source = parseJson(pair.sourceBytes.toString('utf8'), `Source ${pair.sourceFilename}`);
  if (source === null || typeof source !== 'object' || Array.isArray(source) ||
      !Array.isArray(source.assets) || !source.assets.length) {
    throw new Error('JSON source must be an object with a nonempty assets array.');
  }
  const symbols = new Set();
  const assets = source.assets.map(asset => {
    if (!asset || typeof asset !== 'object' || Array.isArray(asset) ||
        typeof asset.symbol !== 'string' || !asset.symbol.trim() ||
        typeof asset.name !== 'string' || !asset.name.trim() ||
        typeof asset.assetClass !== 'string' ||
        !Array.isArray(asset.returns) || !asset.returns.length) {
      throw new Error('Each JSON asset must include nonblank symbol, name, assetClass, and returns.');
    }
    if (symbols.has(asset.symbol)) throw new Error(`JSON source duplicates asset symbol ${asset.symbol}.`);
    symbols.add(asset.symbol);
    const years = new Set();
    const returns = asset.returns.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item) ||
          !Number.isInteger(item.year) || typeof item.return !== 'number' ||
          !Number.isFinite(item.return) || item.return < -1 ||
          Math.round(item.return * 10000) !== item.return * 10000) {
        throw new Error(`JSON source has an invalid annual return for ${asset.symbol}.`);
      }
      if (years.has(item.year)) throw new Error(`JSON source duplicates ${asset.symbol}/${item.year}.`);
      years.add(item.year);
      return { year: item.year, return: item.return };
    });
    return { symbol: asset.symbol, name: asset.name, assetClass: asset.assetClass, returns };
  });
  return assets;
}

function assertSubsetScope(assets, manifest) {
  const scope = manifest.assetScope;
  if (!scope || !['complete', 'subset'].includes(scope.mode)) {
    throw new Error('Manifest assetScope must explicitly declare complete or subset mode.');
  }
  if (scope.mode !== 'subset') return;
  const sourceSymbols = assets.map(asset => asset.symbol).sort();
  const declaredSymbols = Array.isArray(scope.symbols) ? [...scope.symbols].sort() : [];
  if (JSON.stringify(sourceSymbols) !== JSON.stringify(declaredSymbols)) {
    throw new Error('Subset manifest symbols must exactly match source symbols.');
  }
  const sourceYears = [...new Set(assets.flatMap(asset => asset.returns.map(item => item.year)))].sort((a, b) => a - b);
  const declaredYears = Array.isArray(manifest.coveredCalendarYears)
    ? [...manifest.coveredCalendarYears].sort((a, b) => a - b)
    : [];
  if (JSON.stringify(sourceYears) !== JSON.stringify(declaredYears)) {
    throw new Error('Manifest coveredCalendarYears must exactly match source years.');
  }
}

function loadBaseline(filename) {
  const parsed = parseJson(readFileSync(path.join(presetDirectory, filename), 'utf8'), filename);
  return parsed;
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
      const years = [...byYear.keys()].sort((a, b) => a - b);
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

function orderedJson(value) {
  return `${JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])), null, 2)}\n`;
}

function renderReport(pair, assets, stocks, indices) {
  const manifest = pair.manifest;
  const symbols = assets.map(asset => asset.symbol).sort().join(', ');
  const years = [...new Set(assets.flatMap(asset => asset.returns.map(item => item.year)))].sort((a, b) => a - b);
  const changes = [];
  for (const asset of [...assets].sort((left, right) => left.symbol < right.symbol ? -1 : left.symbol > right.symbol ? 1 : 0)) {
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
  return [
    '# Historical Return Dry-Run Report',
    '',
    '## Reviewed input',
    '',
    `- Source: \`${pair.sourceFilename}\` (${pair.sourceFormat})`,
    `- SHA-256: \`${manifest.snapshotSha256}\``,
    `- Attribution: ${manifest.sourceAttribution}`,
    `- Reviewer: ${manifest.reviewer}`,
    `- Review date: ${manifest.reviewDate}`,
    `- Methodology: ${manifest.methodology.returnConvention}; dividends reinvested: ${manifest.methodology.dividendsReinvested}; endpoints: ${manifest.methodology.endpoints}; units: ${manifest.methodology.units}; decimal places: ${manifest.methodology.decimalPlaces}; ETF policy: ${manifest.methodology.etfReturnPolicy}`,
    `- Scope: ${manifest.assetScope.mode}${manifest.assetScope.mode === 'subset' ? ` — ${manifest.assetScope.rationale}` : ''}`,
    `- Symbols: ${symbols}`,
    `- Covered years: ${years.join(', ')}`,
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
  const pair = readReviewedPair(options);
  const assets = parseSource(pair);
  assertSubsetScope(assets, pair.manifest);
  const stocks = loadBaseline('stocks.json');
  const indices = loadBaseline('indices.json');
  const candidates = mergeReviewedAssets(assets, stocks, indices);
  assertOutputDirectory(options['--output-dir']);
  const report = renderReport(pair, assets, stocks, indices);
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
