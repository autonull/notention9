import type { Quantity, CompoundQuantity } from './types/index.js';
import {
    UNIT_ALIASES,
    CONVERSIONS,
    CATEGORIES,
    TIME_UNITS,
    DISTANCE_UNITS,
} from './data/units.js';

export const parseQuantity = (text: string): Quantity | null => {
    if (!text) return null;
    const clean = text.trim();

    // Regex to capture number part and unit part
    // Handles: "100 km", "100km", "$100", "100 USD", "100 USD/hr"

    // 1. Currency Symbol prefix: $100
    const prefixMatch = clean.match(/^([$€£¥₹])\s*([\d,\.]+)\s*(.*)$/);
    if (prefixMatch) {
        const symbol = prefixMatch[1];
        const valStr = prefixMatch[2].replace(/,/g, '');
        const suffix = prefixMatch[3] ? prefixMatch[3].trim() : ''; // could be "/hr"
        const val = parseFloat(valStr);
        if (isNaN(val)) return null;

        const baseUnit = normalizeUnit(symbol);

        if (suffix.startsWith('/')) {
            const rateUnit = normalizeUnit(suffix.slice(1));
            const compoundUnit = `${baseUnit}/${rateUnit}`;

            // Determine semantic type based on the denominator
            let semanticType: 'rate' | 'ratio' | 'frequency' | 'other' = 'rate';
            if (TIME_UNITS.includes(rateUnit)) {
                semanticType = 'rate'; // e.g., USD/hour, EUR/day
            } else if (DISTANCE_UNITS.includes(rateUnit)) {
                semanticType = 'ratio'; // e.g., km/meter
            }

            return {
                value: val,
                unit: compoundUnit,
                unitType: 'compound',
                numerator: baseUnit,
                denominator: rateUnit,
                semanticType: semanticType as 'rate' | 'ratio' | 'frequency' | 'other'
            };
        }

        // Simple price
        return {
            value: val,
            unit: baseUnit,
            unitType: 'simple',
            semanticType: 'price'
        };
    }

    // 2. Suffix units: 100 km, 100 km/h, 25 °C, 2 g/cm³
    const suffixMatch = clean.match(/^([\d,\.]+)\s*([a-zA-Z°\/\$€£¥₹²³µ]+)$/);
    if (suffixMatch) {
        const valStr = suffixMatch[1].replace(/,/g, '');
        const rawUnit = suffixMatch[2];
        const val = parseFloat(valStr);
        if (isNaN(val)) return null;

        // Check for compound unit (e.g. km/h, USD/mo)
        if (rawUnit.includes('/')) {
            const [u1, u2] = rawUnit.split('/');
            const n1 = normalizeUnit(u1);
            const n2 = normalizeUnit(u2);
            const compoundUnit = `${n1}/${n2}`;

            // Determine semantic type based on units
            let semanticType: 'rate' | 'ratio' | 'frequency' | 'other' = 'ratio';
            if (CATEGORIES[n1] === 'currency' && TIME_UNITS.includes(n2)) {
                semanticType = 'rate'; // Price rate (e.g., USD/hour)
            } else if (TIME_UNITS.includes(n1) && TIME_UNITS.includes(n2)) {
                semanticType = 'frequency'; // Time ratios
            } else if (DISTANCE_UNITS.includes(n1) && DISTANCE_UNITS.includes(n2)) {
                semanticType = 'ratio'; // Distance ratios
            } else if (CATEGORIES[n1] === CATEGORIES[n2]) {
                semanticType = 'ratio'; // Same category ratios
            } else {
                semanticType = 'other'; // Mixed category compound
            }

            return {
                value: val,
                unit: compoundUnit,
                unitType: 'compound',
                numerator: n1,
                denominator: n2,
                semanticType: semanticType as 'rate' | 'ratio' | 'frequency' | 'other'
            };
        }

        return {
            value: val,
            unit: normalizeUnit(rawUnit),
            unitType: 'simple',
            semanticType: CATEGORIES[normalizeUnit(rawUnit)] as any || 'other'
        };
    }

    // 3. Just number
    const val = parseFloat(clean.replace(/,/g, ''));
    if (!isNaN(val) && isFinite(val) && String(val) === clean.replace(/,/g, '')) {
         return {
             value: val,
             unit: '',
             unitType: 'simple',
             semanticType: 'other'
         }; // Unitless
    }

    return null;
};

export const normalizeUnit = (u: string): string => {
    const clean = u.toLowerCase().trim();
    return UNIT_ALIASES[clean] || UNIT_ALIASES[u.trim()] || u.trim(); // Check lowercase alias, then raw
};

export const compareQuantities = (a: Quantity, b: Quantity): number | null => {
    // Returns 1 if a > b, -1 if a < b, 0 if equal, null if not comparable

    // Check for null values
    if (!a || !b) {
        return null;
    }

    // 1. Identity
    if (a.unit === b.unit) {
        return a.value > b.value ? 1 : a.value < b.value ? -1 : 0;
    }

    // 2. Both are compound units (rate)
    if (a.unitType === 'compound' && b.unitType === 'compound' && a.denominator && b.denominator) {
        // Only support if denominators match or are convertible AND numerators match or are convertible
        const numFactor = getConversionFactor(a.numerator || '', b.numerator || '');
        const denFactor = getConversionFactor(a.denominator, b.denominator);

        if (numFactor !== null && denFactor !== null) {
            // value = val * numFactor / denFactor
            // e.g. 100 km/h vs m/s
            // km -> m (1000)
            // h -> s (3600)
            // 100 * 1000 / 3600 = 27.7 m/s

            const convertedAValue = a.value * numFactor / denFactor;
            return convertedAValue > b.value ? 1 : convertedAValue < b.value ? -1 : 0;
        }
    } else if (a.unitType !== 'compound' && b.unitType !== 'compound') {
        // Simple unit conversion

        // Special handling for temperature
        if (CATEGORIES[a.unit] === 'temperature' && CATEGORIES[b.unit] === 'temperature') {
            const convertedTemp = convertTemperature(a.value, a.unit, b.unit);
            if (convertedTemp !== null) {
                return convertedTemp > b.value ? 1 : convertedTemp < b.value ? -1 : 0;
            }
        } else {
            // Standard unit conversion
            const factor = getConversionFactor(a.unit, b.unit);
            if (factor !== null) {
                const convertedA = a.value * factor;
                 return convertedA > b.value ? 1 : convertedA < b.value ? -1 : 0;
            }
        }
    }

    return null; // Not comparable
};

/**
 * Gets conversion factor between two units of the same category
 * Special handling for temperature units which require non-linear conversion
 */
const getConversionFactor = (from: string, to: string): number | null => {
    if (from === to) return 1;

    // Check categories
    const catA = CATEGORIES[from];
    const catB = CATEGORIES[to];

    // If currency (and different), we assume not convertible for now (unless we have rates, which we don't for USD->EUR)
    if (catA === 'currency' || catB === 'currency') return null;

    // Special handling for temperature
    if (catA === 'temperature' && catB === 'temperature') {
        // Temperature conversions are non-linear, return special indicator
        return null; // Will be handled separately
    }

    if (catA && catB && catA === catB) {
        const rateA = CONVERSIONS[from];
        const rateB = CONVERSIONS[to];
        if (rateA && rateB) {
            // Convert from A to Base, then Base to B
            // Value in Base = ValueA * rateA
            // Value in B = ValueBase / rateB
            return rateA / rateB;
        }
    }
    return null;
};

/**
 * Converts temperature between different scales
 */
export const convertTemperature = (value: number, from: string, to: string): number | null => {
    if (from === to) return value;

    // Convert to Celsius first, then to target scale
    let celsius: number;

    switch (from) {
        case '°C':
            celsius = value;
            break;
        case '°F':
            celsius = (value - 32) * 5/9;
            break;
        case 'K':
            celsius = value - 273.15;
            break;
        default:
            return null; // Not a temperature unit
    }

    switch (to) {
        case '°C':
            return celsius;
        case '°F':
            return (celsius * 9/5) + 32;
        case 'K':
            return celsius + 273.15;
        default:
            return null; // Not a temperature unit
    }
};

/**
 * Determines if two quantities are semantically compatible for comparison
 */
export const areQuantitiesCompatible = (a: Quantity, b: Quantity): boolean => {
    // Same semantic type
    if (a.semanticType === b.semanticType) {
        return true;
    }

    // Both are monetary (price/rate)
    if ((a.semanticType === 'price' || a.semanticType === 'rate') &&
        (b.semanticType === 'price' || b.semanticType === 'rate')) {
        return CATEGORIES[a.numerator || a.unit] === 'currency' &&
               CATEGORIES[b.numerator || b.unit] === 'currency';
    }

    // Both are durations
    if ((a.semanticType === 'duration' || a.unitType === 'simple') &&
        (b.semanticType === 'duration' || b.unitType === 'simple')) {
        return CATEGORIES[a.unit] === 'time' && CATEGORIES[b.unit] === 'time';
    }

    // Both have the same unit category (for conversion purposes)
    const catA = CATEGORIES[a.unit];
    const catB = CATEGORIES[b.unit];
    if (catA && catB && catA === catB) {
        return true;
    }

    // Special case: temperature units are compatible even though conversion is non-linear
    if (catA === 'temperature' && catB === 'temperature') {
        return true;
    }

    return false;
};

/**
 * Creates a compound quantity from two simple quantities
 */
export const createCompoundQuantity = (numerator: Quantity, denominator: Quantity): CompoundQuantity | null => {
    if (numerator.unitType !== 'simple' || denominator.unitType !== 'simple') {
        return null; // Can only create compound from simple quantities
    }

    // For monetary rates: e.g., USD per hour
    if (CATEGORIES[numerator.unit] === 'currency' && CATEGORIES[denominator.unit] === 'time') {
        return {
            value: numerator.value / denominator.value,
            numerator: numerator.unit,
            denominator: denominator.unit,
            semanticType: 'rate'
        };
    }

    // For other ratios
    return {
        value: numerator.value / denominator.value,
        numerator: numerator.unit,
        denominator: denominator.unit,
        semanticType: 'ratio' as 'rate' | 'ratio' | 'frequency'
    };
};

/**
 * Multiplies two quantities, handling units appropriately
 */
export const multiplyQuantities = (a: Quantity, b: Quantity): Quantity => {
    let resultValue = a.value * b.value;
    let resultUnit = '';
    let resultUnitType: 'simple' | 'compound' | 'rate' = 'simple';
    let resultSemanticType: 'price' | 'rate' | 'duration' | 'frequency' | 'ratio' | 'other' = 'other';

    // Handle unit multiplication
    if (a.unit && b.unit) {
        // If both are simple units from different categories (e.g., length * width = area)
        if (a.unitType === 'simple' && b.unitType === 'simple') {
            if (a.unit !== b.unit) {
                resultUnit = `${a.unit}*${b.unit}`;
                resultUnitType = 'compound';
                resultSemanticType = 'other';
            } else {
                // Same units multiplied (e.g., m * m = m²)
                resultUnit = `${a.unit}²`;
                resultUnitType = 'simple';
                resultSemanticType = (a.semanticType || 'other') as 'price' | 'rate' | 'duration' | 'frequency' | 'other';
            }
        } else if (a.unitType === 'compound' || b.unitType === 'compound') {
            // Complex compound unit multiplication
            resultUnit = `${a.unit}*${b.unit}`;
            resultUnitType = 'compound';
            resultSemanticType = 'other' as 'price' | 'rate' | 'duration' | 'frequency' | 'other';
        } else {
            resultUnit = a.unit || b.unit;
            resultSemanticType = (a.semanticType || b.semanticType || 'other') as 'price' | 'rate' | 'duration' | 'frequency' | 'other';
        }
    }

    return {
        value: resultValue,
        unit: resultUnit,
        unitType: resultUnitType,
        semanticType: resultSemanticType
    };
};

/**
 * Divides two quantities, handling units appropriately
 */
export const divideQuantities = (a: Quantity, b: Quantity): Quantity => {
    if (b.value === 0) {
        throw new Error("Division by zero");
    }

    let resultValue = a.value / b.value;
    let resultUnit = '';
    let resultUnitType: 'simple' | 'compound' | 'rate' = 'simple';
    let resultSemanticType: 'price' | 'rate' | 'duration' | 'frequency' | 'ratio' | 'other' = 'other';

    // Handle unit division
    if (a.unit && b.unit) {
        if (a.unit === b.unit) {
            // Same units cancel out (dimensionless result)
            resultUnit = '';
            resultUnitType = 'simple';
            resultSemanticType = 'other';
        } else if (a.unitType === 'simple' && b.unitType === 'simple') {
            // Simple division creates a ratio/rate
            resultUnit = `${a.unit}/${b.unit}`;
            resultUnitType = 'compound';
            // Determine semantic type based on the units involved
            if (CATEGORIES[a.unit] === 'currency' && TIME_UNITS.includes(b.unit)) {
                resultSemanticType = 'rate'; // e.g., USD/hour
            } else if (TIME_UNITS.includes(a.unit) && TIME_UNITS.includes(b.unit)) {
                resultSemanticType = 'frequency'; // e.g., hour/minute
            } else {
                resultSemanticType = 'ratio'; // e.g., general ratio
            }
        } else {
            // At least one is compound
            resultUnit = `${a.unit}/${b.unit}`;
            resultUnitType = 'compound';
            resultSemanticType = 'ratio';
        }
    } else if (a.unit) {
        // Only dividend has a unit
        resultUnit = a.unit;
        resultSemanticType = (a.semanticType || 'other') as 'price' | 'rate' | 'duration' | 'frequency' | 'other';
    } else if (b.unit) {
        // Only divisor has a unit - result is inverse
        resultUnit = `1/${b.unit}`;
        resultUnitType = 'compound';
        resultSemanticType = 'other' as 'price' | 'rate' | 'duration' | 'frequency' | 'other';
    }

    return {
        value: resultValue,
        unit: resultUnit,
        unitType: resultUnitType,
        semanticType: resultSemanticType
    };
};
