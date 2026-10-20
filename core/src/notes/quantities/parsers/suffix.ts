import { normalizeUnit } from '../index.js';
import { createCompoundQuantityResult, getSemanticTypeForUnit } from '../semantics/determineType.js';
import type { Quantity } from '../../../types/index.js';

export const parseSuffixUnits = (clean: string): Quantity | null => {
  const match = clean.match(/^([\d,\.]+)\s*([a-zA-Z°\/\$€£¥₹²³µ]+)$/);
  if (!match) return null;

  const [, valStr, rawUnit] = match;
  const val = parseFloat(valStr.replace(/,/g, ''));
  if (isNaN(val)) return null;

  if (rawUnit.includes('/')) {
    const [u1, u2] = rawUnit.split('/');
    return createCompoundQuantityResult(val, normalizeUnit(u1), normalizeUnit(u2));
  }

  const unit = normalizeUnit(rawUnit);
  return {
    value: val,
    unit,
    unitType: 'simple',
    semanticType: getSemanticTypeForUnit(unit),
  };
};