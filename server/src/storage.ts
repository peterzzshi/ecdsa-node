import fs from 'fs';
import path from 'path';
import { Balances, Nonces } from './types';

interface StorageData {
  balances: Balances;
  nonces: Nonces;
}

const STORAGE_FILE = path.join(__dirname, 'data.json');

/**
 * Load data from storage file
 */
export function loadStorage(): StorageData {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    // If file doesn't exist or is corrupted, return defaults
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load storage: ${message}`);
  }

  // Return empty state if file doesn't exist
  return {
    balances: {},
    nonces: {},
  };
}

/**
 * Save data to storage file
 */
export function saveStorage(balances: Balances, nonces: Nonces): void {
  try {
    const data: StorageData = { balances, nonces };
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to save storage: ${message}`);
  }
}

/**
 * Auto-save on a schedule (debounced)
 */
let saveTimeout: NodeJS.Timeout | null = null;

export function scheduleSave(balances: Balances, nonces: Nonces): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    saveStorage(balances, nonces);
    saveTimeout = null;
  }, 1000); // Save 1 second after last change
}
