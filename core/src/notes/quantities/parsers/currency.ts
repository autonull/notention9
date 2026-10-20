import { normalizeUnit } from '../index.js';
import { createCompoundQuantityResult } from '../semantics/determineType.js';
import type { Quantity } from '../../../types/index.js';

export const parseCurrency = (clean: string): Quantity | null => {
  const match = clean.match(/^([$€£¥₹])\s*([\d,\.]+)\s*(.*)$/);
  if (!match) return null;

  const [, symbol, valStr, suffix] = match;
  const val = parseFloat(valStr.replace(/,/g, ''));
  if (isNaN(val)) return null;

  const baseUnit = normalizeUnit(symbol);
  const trimmedSuffix = suffix ? suffix.trim() : '';

  if (trimmedSuffix.startsWith('/')) {
    const rateUnit = normalizeUnit(trimmedSuffix.slice(1));
    return createCompoundQuantityResult(val, baseUnit, rateUnit);
  }

  return {
    value: val,
    unit: baseUnit,
    unitType: 'simple',
    semanticType: 'price',
  };
};