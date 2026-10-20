import { aliases } from './aliases.js';
import { conversions } from './conversions.js';
import { categories } from './categories.js';
import { systems } from './systems.js';
import { arrays } from './arrays.js';

const units = {
  aliases,
  conversions,
  categories,
  systems,
  arrays
};

export const UNIT_ALIASES = units.aliases;
export const CONVERSIONS = units.conversions;
export const CATEGORIES = units.categories;
export const UNIT_SYSTEMS = units.systems;

export const {
  TIME_UNITS,
  DISTANCE_UNITS,
  MASS_UNITS,
  VOLUME_UNITS,
  AREA_UNITS,
  ENERGY_UNITS,
  POWER_UNITS,
  PRESSURE_UNITS,
  FREQUENCY_UNITS,
  SPEED_UNITS,
  TEMPERATURE_UNITS
} = units.arrays;

export { loadUnits, getUnitAliases, getUnitConversions, getUnitCategories, getUnitSystems, getUnitArrays, clearCache } from './loader.js';