/**
 * Bulk Import Format Templates
 *
 * Provides pre-filled CSV and JSON templates for bulk import,
 * with sample data showing the expected format.
 */

/**
 * CSV template with 2 sample assets, 5 years each
 * Format: symbol, name, asset_class, year, annual_return
 */
export const BULK_CSV_TEMPLATE = `symbol,name,asset_class,year,annual_return
SPY,S&P 500 ETF Trust,equity_index,1995,0.3758
SPY,S&P 500 ETF Trust,equity_index,1996,0.2296
SPY,S&P 500 ETF Trust,equity_index,1997,0.3336
SPY,S&P 500 ETF Trust,equity_index,1998,0.2858
SPY,S&P 500 ETF Trust,equity_index,1999,0.2104
CUSTOM1,My Custom Asset,equity_stock,2020,0.1250
CUSTOM1,My Custom Asset,equity_stock,2021,-0.0320
CUSTOM1,My Custom Asset,equity_stock,2022,0.0890
CUSTOM1,My Custom Asset,equity_stock,2023,0.2650
CUSTOM1,My Custom Asset,equity_stock,2024,0.1580`;

/**
 * JSON template structure with 2 sample assets, 5 years each
 * Compatible with PresetData format
 */
export const BULK_JSON_TEMPLATE = {
  version: 1,
  exportedAt: '(generated on download)',
  assets: [
    {
      symbol: 'SPY',
      name: 'S&P 500 ETF Trust',
      assetClass: 'equity_index',
      returns: [
        { date: '1995', return: 0.3758 },
        { date: '1996', return: 0.2296 },
        { date: '1997', return: 0.3336 },
        { date: '1998', return: 0.2858 },
        { date: '1999', return: 0.2104 },
      ],
    },
    {
      symbol: 'CUSTOM1',
      name: 'My Custom Asset',
      assetClass: 'equity_stock',
      returns: [
        { date: '2020', return: 0.125 },
        { date: '2021', return: -0.032 },
        { date: '2022', return: 0.089 },
        { date: '2023', return: 0.265 },
        { date: '2024', return: 0.158 },
      ],
    },
  ],
};

/**
 * Download the CSV template file
 * Creates a blob with the template content and triggers download
 */
export function downloadCsvTemplate(): void {
  const blob = new Blob([BULK_CSV_TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'bulk_import_template.csv';
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Download the JSON template file
 * Creates a copy with current timestamp and triggers download
 */
export function downloadJsonTemplate(): void {
  // Create a copy with the current timestamp
  const templateWithTimestamp = {
    ...BULK_JSON_TEMPLATE,
    exportedAt: new Date().toISOString(),
  };

  const jsonContent = JSON.stringify(templateWithTimestamp, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'bulk_import_template.json';
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
