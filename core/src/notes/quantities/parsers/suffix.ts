import { normalizeUnit } from '../index.js';
import { createCompoundQuantityResult, getSemanticTypeForUnit } from '../semantics/determineType.js';
import type { Quantity } from '../../../types/index.js';

export const parseSuffixUnits = (clean: string): Quantity | null => {
  // Handle "per" format: "50 USD per year" -> "50 USD/year"
  let normalized = clean;
  const perMatch = clean.match(/^([\d,\.]+)\s+([a-zA-Z$€£¥₹]+)\s+per\s+([a-zA-Z]+)$/i);
  if (perMatch) {
    const [, valStr, numUnit, denUnit] = perMatch;
    normalized = `${valStr} ${numUnit}/${denUnit}`;
  }

  const match = normalized.match(/^([\d,\.]+)\s*([a-zA-Z°\/\$€£¥₹²³µ]+)$/);
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