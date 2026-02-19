import type { Quantity, CompoundQuantity } from './types/index.js';
import {
    UNIT_ALIASES,
    CONVERSIONS,
    CATEGORIES,
    TIME_UNITS,
    DISTANCE_UNITS,
} from './data/units.js';

type SemanticType = 'rate' | 'ratio' | 'frequency' | 'other' | 'price';

const determineCompoundSemanticType = (num: string, den: string): SemanticType => {
    if (CATEGORIES[num] === 'currency' && TIME_UNITS.includes(den)) return 'rate';
    if (TIME_UNITS.includes(num) && TIME_UNITS.includes(den)) return 'frequency';
    // Default to ratio for compound units (aligns with divideQuantities legacy behavior)
    return 'ratio';
};

const createCompoundQuantityResult = (val: number, num: string, den: string): Quantity => {
    const semanticType = determineCompoundSemanticType(num, den);
    return {
        value: val,
        unit: `${num}/${den}`,
        unitType: 'compound',
        numerator: num,
        denominator: den,
        semanticType
    };
};

const parseCurrency = (clean: string): Quantity | null => {
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
        semanticType: 'price'
    };
};

const parseSuffixUnits = (clean: string): Quantity | null => {
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
        semanticType: (CATEGORIES[unit] as any) || 'other'
    };
};

const parseSimpleNumber = (clean: string): Quantity | null => {
    const val = parseFloat(clean.replace(/,/g, ''));
    if (!isNaN(val) && isFinite(val) && String(val) === clean.replace(/,/g, '')) {
         return {
             value: val,
             unit: '',
             unitType: 'simple',
             semanticType: 'other'
         };
    }
    return null;
};

export const parseQuantity = (text: string): Quantity | null => {
    if (!text) return null;
    const clean = text.trim();

    return parseCurrency(clean) || parseSuffixUnits(clean) || parseSimpleNumber(clean);
};

export const normalizeUnit = (u: string): string => {
    const clean = u.toLowerCase().trim();
    return UNIT_ALIASES[clean] || UNIT_ALIASES[u.trim()] || u.trim();
};

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

const getConversionFactor = (from: string, to: string): number | null => {
    if (from === to) return 1;
    const catA = CATEGORIES[from];
    const catB = CATEGORIES[to];

    if (!catA || !catB || catA !== catB || catA === 'currency' || catA === 'temperature') return null;

    const rateA = CONVERSIONS[from];
    const rateB = CONVERSIONS[to];
    return (rateA && rateB) ? rateA / rateB : null;
};

export const convertTemperature = (value: number, from: string, to: string): number | null => {
    if (from === to) return value;
    let celsius: number;

    switch (from) {
        case '°C': celsius = value; break;
        case '°F': celsius = (value - 32) * 5/9; break;
        case 'K': celsius = value - 273.15; break;
        default: return null;
    }

    switch (to) {
        case '°C': return celsius;
        case '°F': return (celsius * 9/5) + 32;
        case 'K': return celsius + 273.15;
        default: return null;
    }
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

export const createCompoundQuantity = (numerator: Quantity, denominator: Quantity): CompoundQuantity | null => {
    if (numerator.unitType !== 'simple' || denominator.unitType !== 'simple') return null;

    const semanticType = determineCompoundSemanticType(numerator.unit, denominator.unit);

    return {
        value: numerator.value / denominator.value,
        numerator: numerator.unit,
        denominator: denominator.unit,
        semanticType: semanticType as 'rate' | 'ratio' | 'frequency'
    };
};

export const multiplyQuantities = (a: Quantity, b: Quantity): Quantity => {
    const value = a.value * b.value;

    if (a.unit && b.unit) {
        if (a.unitType === 'simple' && b.unitType === 'simple') {
            if (a.unit === b.unit) {
                return { value, unit: `${a.unit}²`, unitType: 'simple', semanticType: (a.semanticType || 'other') as any };
            }
            return { value, unit: `${a.unit}*${b.unit}`, unitType: 'compound', semanticType: 'other' };
        }
        return { value, unit: `${a.unit || ''}*${b.unit || ''}`, unitType: 'compound', semanticType: 'other' };
    }

    const unit = a.unit || b.unit;
    const semanticType = (a.semanticType || b.semanticType || 'other') as any;

    return { value, unit, unitType: a.unit ? a.unitType : b.unitType, semanticType };
};

export const divideQuantities = (a: Quantity, b: Quantity): Quantity => {
    if (b.value === 0) throw new Error("Division by zero");
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
            semanticType: semanticType as any
        };
    } else if (a.unit) {
        return { value, unit: a.unit, unitType: a.unitType, semanticType: (a.semanticType || 'other') as any };
    } else if (b.unit) {
        return { value, unit: `1/${b.unit}`, unitType: 'compound', semanticType: 'other' };
    }

    return { value, unit: '', unitType: 'simple', semanticType: 'other' };
};
