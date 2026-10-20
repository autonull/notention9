import { CATEGORIES, TIME_UNITS } from '../../../data/units/index.js';
import type { Quantity } from '../../../types/index.js';

type SemanticType = 'rate' | 'ratio' | 'frequency' | 'other' | 'price';

export const determineCompoundSemanticType = (num: string, den: string): SemanticType => {
  if (CATEGORIES[num] === 'currency' && TIME_UNITS.includes(den)) return 'rate';
  if (TIME_UNITS.includes(num) && TIME_UNITS.includes(den)) return 'frequency';
  return 'ratio';
};

export const getSemanticTypeForUnit = (unit: string): SemanticType => {
  return (CATEGORIES[unit] as SemanticType) || 'other';
};

export const createCompoundQuantityResult = (val: number, num: string, den: string): Quantity => {
  const semanticType = determineCompoundSemanticType(num, den);
  return {
    value: val,
    unit: `${num}/${den}`,
    unitType: 'compound',
    numerator: num,
    denominator: den,
    semanticType,
  };
};

export const createCompoundQuantity = (numerator: Quantity, denominator: Quantity): Quantity | null => {
  if (numerator.unitType !== 'simple' || denominator.unitType !== 'simple') return null;

  const semanticType = determineCompoundSemanticType(numerator.unit, denominator.unit);

  return {
    value: numerator.value / denominator.value,
    unit: `${numerator.unit}/${denominator.unit}`,
    unitType: 'compound',
    numerator: numerator.unit,
    denominator: denominator.unit,
    semanticType: semanticType as 'rate' | 'ratio' | 'frequency',
  };
};

export const areQuantitiesCompatible = (a: Quantity, b: Quantity): boolean => {
  if (a.semanticType === b.semanticType) return true;

  if ((a.semanticType === 'price' || a.semanticType === 'rate') &&
      (b.semanticType === 'price' || b.semanticType === 'rate')) {
    return CATEGORIES[a.numerator || a.unit] === 'currency' &&
           CATEGORIES[b.numerator || b.unit] === 'currency';
  }

  if ((a.semanticType === 'duration' || a.unitType === 'simple') &&
      (b.semanticType === 'duration' || b.unitType === 'simple')) {
    return CATEGORIES[a.unit] === 'time' && CATEGORIES[b.unit] === 'time';
  }

  const catA = CATEGORIES[a.unit];
  const catB = CATEGORIES[b.unit];

  return !!(catA && catB && (catA === catB || (catA === 'temperature' && catB === 'temperature')));
};