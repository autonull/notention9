import type { Quantity } from '../../../types/index.js';

export const parseSimpleNumber = (clean: string): Quantity | null => {
  const val = parseFloat(clean.replace(/,/g, ''));
  if (!isNaN(val) && isFinite(val) && String(val) === clean.replace(/,/g, '')) {
    return {
      value: val,
      unit: '',
      unitType: 'simple',
      semanticType: 'other',
    };
  }
  return null;
};