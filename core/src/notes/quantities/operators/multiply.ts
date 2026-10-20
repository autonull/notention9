import type { Quantity } from '../../../types/index.js';

export const multiplyQuantities = (a: Quantity, b: Quantity): Quantity => {
  const value = a.value * b.value;

  if (a.unit && b.unit) {
    if (a.unitType === 'simple' && b.unitType === 'simple') {
      if (a.unit === b.unit) {
        return { value, unit: `${a.unit}²`, unitType: 'simple', semanticType: a.semanticType || 'other' };
      }
      return { value, unit: `${a.unit}*${b.unit}`, unitType: 'compound', semanticType: 'other' };
    }
    return { value, unit: `${a.unit || ''}*${b.unit || ''}`, unitType: 'compound', semanticType: 'other' };
  }

  const unit = a.unit || b.unit;
  const semanticType = a.semanticType || b.semanticType || 'other';

  return { value, unit, unitType: a.unit ? a.unitType : b.unitType, semanticType };
};