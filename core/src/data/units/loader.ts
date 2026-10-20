import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const JSON_DIR = join(__dirname, 'json');

interface UnitData {
  aliases: Record<string, string>;
  conversions: Record<string, number>;
  categories: Record<string, string>;
  systems: {
    si: { baseUnits: string[]; derivedUnits: string[] };
    imperial: { distance: string[]; mass: string[]; volume: string[]; temperature: string[] };
    metric: { distance: string[]; mass: string[]; volume: string[]; temperature: string[] };
    astronomical: string[];
    nautical: string[];
    surveyors: string[];
  };
  arrays: {
    TIME_UNITS: string[];
    DISTANCE_UNITS: string[];
    MASS_UNITS: string[];
    VOLUME_UNITS: string[];
    AREA_UNITS: string[];
    ENERGY_UNITS: string[];
    POWER_UNITS: string[];
    PRESSURE_UNITS: string[];
    FREQUENCY_UNITS: string[];
    SPEED_UNITS: string[];
    TEMPERATURE_UNITS: string[];
  };
}

let cachedData: UnitData | null = null;

function loadJson<T>(filename: string): T {
  const filepath = join(JSON_DIR, filename);
  const content = readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as T;
}

export function loadUnits(): UnitData {
  if (cachedData) return cachedData;

  cachedData = {
    aliases: loadJson<Record<string, string>>('aliases.json'),
    conversions: loadJson<Record<string, number>>('conversions.json'),
    categories: loadJson<Record<string, string>>('categories.json'),
    systems: loadJson<UnitData['systems']>('systems.json'),
    arrays: loadJson<UnitData['arrays']>('arrays.json')
  };

  return cachedData;
}

export function getUnitAliases(): Record<string, string> {
  return loadUnits().aliases;
}

export function getUnitConversions(): Record<string, number> {
  return loadUnits().conversions;
}

export function getUnitCategories(): Record<string, string> {
  return loadUnits().categories;
}

export function getUnitSystems(): UnitData['systems'] {
  return loadUnits().systems;
}

export function getUnitArrays(): UnitData['arrays'] {
  return loadUnits().arrays;
}

export function clearCache(): void {
  cachedData = null;
}