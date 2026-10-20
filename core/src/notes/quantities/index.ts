import { UNIT_ALIASES } from '../../data/units/index.js';
import { parseCurrency } from './parsers/currency.js';
import { parseSuffixUnits } from './parsers/suffix.js';
import { parseSimpleNumber } from './parsers/number.js';
import { convertTemperature } from './converters/temperature.js';
import { getConversionFactor } from './converters/linear.js';
import { compareQuantities } from './operators/compare.js';
import { multiplyQuantities } from './operators/multiply.js';
import { divideQuantities } from './operators/divide.js';
import {
  createCompoundQuantityResult,
  getSemanticTypeForUnit,
  determineCompoundSemanticType,
  createCompoundQuantity,
  areQuantitiesCompatible,
} from './semantics/determineType.js';
import type { Quantity, CompoundQuantity } from '../../types/index.js';

export const normalizeUnit = (u: string): string => {
  const clean = u.toLowerCase().trim();
  return UNIT_ALIASES[clean] || UNIT_ALIASES[u.trim()] || u.trim();
};

export const parseQuantity = (text: string): Quantity | null => {
  if (!text) return null;
  const clean = text.trim();

  return parseCurrency(clean) || parseSuffixUnits(clean) || parseSimpleNumber(clean);
};

export {
  convertTemperature,
  getConversionFactor,
  compareQuantities,
  multiplyQuantities,
  divideQuantities,
  createCompoundQuantityResult,
  getSemanticTypeForUnit,
  determineCompoundSemanticType,
  createCompoundQuantity,
  areQuantitiesCompatible,
};

export type { Quantity, CompoundQuantity } from '../../types/index.js';