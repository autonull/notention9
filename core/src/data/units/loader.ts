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

async function loadJsonNode<T>(filename: string): Promise<T> {
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');
  const { readFileSync } = await import('fs');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const JSON_DIR = join(__dirname, 'json');
  const filepath = join(JSON_DIR, filename);
  const content = readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function loadUnits(): Promise<UnitData> {
  if (cachedData) return cachedData;

  const [aliases, conversions, categories, systems, arrays] = await Promise.all([
    loadJsonNode<Record<string, string>>('aliases.json'),
    loadJsonNode<Record<string, number>>('conversions.json'),
    loadJsonNode<Record<string, string>>('categories.json'),
    loadJsonNode<UnitData['systems']>('systems.json'),
    loadJsonNode<UnitData['arrays']>('arrays.json')
  ]);

  cachedData = { aliases, conversions, categories, systems, arrays };
  return cachedData;
}

export function getUnitAliases(): Record<string, string> {
  if (!cachedData) throw new Error('Unit data not loaded. Call loadUnits() first.');
  return cachedData.aliases;
}

export function getUnitConversions(): Record<string, number> {
  if (!cachedData) throw new Error('Unit data not loaded. Call loadUnits() first.');
  return cachedData.conversions;
}

export function getUnitCategories(): Record<string, string> {
  if (!cachedData) throw new Error('Unit data not loaded. Call loadUnits() first.');
  return cachedData.categories;
}

export function getUnitSystems(): UnitData['systems'] {
  if (!cachedData) throw new Error('Unit data not loaded. Call loadUnits() first.');
  return cachedData.systems;
}

export function getUnitArrays(): UnitData['arrays'] {
  if (!cachedData) throw new Error('Unit data not loaded. Call loadUnits() first.');
  return cachedData.arrays;
}

export function clearCache(): void {
  cachedData = null;
}