/**
 * Portfolio service for IndexedDB CRUD operations
 *
 * Provides save/load/export/import operations for user portfolios.
 */

import { db } from '../db';
import type { PortfolioRecord } from '../schemas/portfolio';

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Save a portfolio to IndexedDB
 * Creates new if no id, updates existing if id present
 * @returns The portfolio id (new or existing)
 */
export async function savePortfolio(
  portfolio: Omit<PortfolioRecord, 'id'> & { id?: number }
): Promise<number> {
  const now = new Date().toISOString();

  // If id is provided, this is an update
  if (portfolio.id !== undefined) {
    const record: PortfolioRecord = {
      ...portfolio,
      id: portfolio.id,
      modified: now
    };
    // put() always returns the key for auto-increment tables
    return (await db.portfolios.put(record)) as number;
  }

  // New portfolio - set created timestamp
  const record: PortfolioRecord = {
    ...portfolio,
    created: now,
    modified: now
  };
  // put() always returns the key for auto-increment tables
  return (await db.portfolios.put(record)) as number;
}

/**
 * Load a single portfolio by id
 */
export async function loadPortfolio(id: number): Promise<PortfolioRecord | undefined> {
  return await db.portfolios.get(id);
}

/**
 * Load all portfolios, ordered by most recently modified first
 */
export async function loadAllPortfolios(): Promise<PortfolioRecord[]> {
  return await db.portfolios.orderBy('modified').reverse().toArray();
}

/**
 * Delete a portfolio by id
 */
export async function deletePortfolio(id: number): Promise<void> {
  await db.portfolios.delete(id);
}

/**
 * Update just the name of a portfolio
 */
export async function updatePortfolioName(id: number, name: string): Promise<void> {
  const now = new Date().toISOString();
  await db.portfolios.update(id, { name, modified: now });
}
