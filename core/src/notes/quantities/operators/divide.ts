import { determineCompoundSemanticType } from '../semantics/determineType.js';
import type { Quantity } from '../../../types/index.js';

export const divideQuantities = (a: Quantity, b: Quantity): Quantity => {
  if (b.value === 0) throw new Error('Division by zero');
  const value = a.value / b.value;

  if (a.unit && b.unit) {
    if (a.unit === b.unit) {
      return { value, unit: '', unitType: 'simple', semanticType: 'other' };
    }

    const semanticType = determineCompoundSemanticType(a.unit, b.unit);
    return {
      value,
      unit: `${a.unit}/${b.unit}`,
      unitType: 'compound',
      semanticType,
    };
  } else if (a.unit) {
    return { value, unit: a.unit, unitType: a.unitType, semanticType: a.semanticType || 'other' };
  } else if (b.unit) {
    return { value, unit: `1/${b.unit}`, unitType: 'compound', semanticType: 'other' };
  }

  return { value, unit: '', unitType: 'simple', semanticType: 'other' };
};