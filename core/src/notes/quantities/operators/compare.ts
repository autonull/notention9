import { convertTemperature } from '../converters/temperature.js';
import { getConversionFactor } from '../converters/linear.js';
import { CATEGORIES } from '../../../data/units/index.js';
import type { Quantity } from '../../../types/index.js';

export const compareQuantities = (a: Quantity, b: Quantity): number | null => {
  if (!a || !b) return null;
  if (a.unit === b.unit) return a.value > b.value ? 1 : a.value < b.value ? -1 : 0;

  if (a.unitType === 'compound' && b.unitType === 'compound' && a.denominator && b.denominator) {
    const numFactor = getConversionFactor(a.numerator || '', b.numerator || '');
    const denFactor = getConversionFactor(a.denominator, b.denominator);

    if (numFactor !== null && denFactor !== null) {
      const convertedAValue = a.value * numFactor / denFactor;
      return convertedAValue > b.value ? 1 : convertedAValue < b.value ? -1 : 0;
    }
  } else if (a.unitType !== 'compound' && b.unitType !== 'compound') {
    if (CATEGORIES[a.unit] === 'temperature' && CATEGORIES[b.unit] === 'temperature') {
      const convertedTemp = convertTemperature(a.value, a.unit, b.unit);
      return convertedTemp !== null ? (convertedTemp > b.value ? 1 : convertedTemp < b.value ? -1 : 0) : null;
    }

    const factor = getConversionFactor(a.unit, b.unit);
    if (factor !== null) {
      const convertedA = a.value * factor;
      return convertedA > b.value ? 1 : convertedA < b.value ? -1 : 0;
    }
  }
  return null;
};