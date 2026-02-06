
import type { Quantity, CompoundQuantity } from './types/index.js';

// Comprehensive unit system with international standards
const UNIT_SYSTEMS = {
  // International System of Units (SI)
  si: {
    baseUnits: ['m', 'kg', 's', 'A', 'K', 'mol', 'cd'], // meter, kilogram, second, ampere, kelvin, mole, candela
    derivedUnits: ['Hz', 'N', 'Pa', 'J', 'W', 'C', 'V', 'F', 'Ω', 'S', 'Wb', 'T', 'H', 'lm', 'lx', 'Bq', 'Gy', 'Sv', 'kat']
  },

  // Imperial/US Customary Units
  imperial: {
    distance: ['in', 'ft', 'yd', 'mi', 'nmi'], // inch, foot, yard, mile, nautical mile
    mass: ['oz', 'lb', 'stone', 'ton'],       // ounce, pound, stone, ton
    volume: ['tsp', 'tbsp', 'floz', 'cup', 'pt', 'qt', 'gal'], // teaspoon, tablespoon, fluid ounce, cup, pint, quart, gallon
    temperature: ['°F']                        // Fahrenheit
  },

  // Metric System (with prefixes)
  metric: {
    distance: ['mm', 'cm', 'm', 'km'],        // millimeter, centimeter, meter, kilometer
    mass: ['mg', 'g', 'kg', 't'],            // milligram, gram, kilogram, tonne
    volume: ['ml', 'cl', 'l', 'hl'],         // milliliter, centiliter, liter, hectoliter
    temperature: ['°C', 'K']                  // Celsius, Kelvin
  },

  // Other Systems
  astronomical: ['au', 'ly', 'pc'],           // astronomical unit, light-year, parsec
  nautical: ['nmi', 'cable', 'fathom'],      // nautical mile, cable, fathom
  surveyors: ['rod', 'chain', 'furlong'],     // rod, chain, furlong
};

// Comprehensive unit aliases mapping to standardized units
const UNIT_ALIASES: Record<string, string> = {
    // Currency (expanded)
    '$': 'USD', 'dollar': 'USD', 'dollars': 'USD', 'usd': 'USD', 'us-dollar': 'USD',
    '€': 'EUR', 'euro': 'EUR', 'euros': 'EUR', 'eur': 'EUR',
    '£': 'GBP', 'gbp': 'GBP',
    '¥': 'JPY', 'yen': 'JPY', 'jpy': 'JPY',
    '₹': 'INR', 'rupee': 'INR', 'inr': 'INR',
    'chf': 'CHF', 'franc': 'CHF',
    'cad': 'CAD', 'aud': 'AUD', 'nzd': 'NZD',
    'cny': 'CNY', 'yuan': 'CNY',
    'krw': 'KRW', 'won': 'KRW',
    'rub': 'RUB', 'ruble': 'RUB',
    'btc': 'BTC', 'bitcoin': 'BTC', 'sats': 'sats', 'satoshis': 'sats',
    'eth': 'ETH', 'ether': 'ETH',

    // Distance - Metric
    'm': 'm', 'meter': 'm', 'meters': 'm',
    'km': 'km', 'kilometer': 'km', 'kilometers': 'km',
    'cm': 'cm', 'centimeter': 'cm', 'centimeters': 'cm',
    'mm': 'mm', 'millimeter': 'mm', 'millimeters': 'mm',
    'μm': 'μm', 'micrometer': 'μm', 'micron': 'μm',
    'nm': 'nm', 'nanometer': 'nm',

    // Distance - Imperial/US
    'in': 'in', 'inch': 'in', 'inches': 'in',
    'ft': 'ft', 'foot': 'ft', 'feet': 'ft',
    'yd': 'yd', 'yard': 'yd', 'yards': 'yd',
    'mi': 'mi', 'mile': 'mi', 'miles': 'mi',
    'nmi': 'nmi', 'nautical-mile': 'nmi', 'nautical_mile': 'nmi',

    // Distance - Other
    'au': 'au', 'astronomical-unit': 'au',
    'ly': 'ly', 'light-year': 'ly',
    'pc': 'pc', 'parsec': 'pc',

    // Mass - Metric
    'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
    'g': 'g', 'gram': 'g', 'grams': 'g',
    'mg': 'mg', 'milligram': 'mg', 'milligrams': 'mg',
    'μg': 'μg', 'microgram': 'μg', 'mcg': 'μg',

    // Mass - Imperial/US
    'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
    'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
    'ton': 'ton', 'short-ton': 'ton',
    'stone': 'stone', 'stones': 'stone',

    // Volume - Metric
    'l': 'l', 'liter': 'l', 'liters': 'l', 'litre': 'l', 'litres': 'l',
    'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
    'cl': 'cl', 'centiliter': 'cl',
    'hl': 'hl', 'hectoliter': 'hl',

    // Volume - Imperial/US
    'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
    'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
    'floz': 'floz', 'fl-oz': 'floz', 'fluid-ounce': 'floz',
    'cup': 'cup', 'cups': 'cup',
    'pt': 'pt', 'pint': 'pt', 'pints': 'pt',
    'qt': 'qt', 'quart': 'qt', 'quarts': 'qt',
    'gal': 'gal', 'gallon': 'gal', 'gallons': 'gal',

    // Time
    's': 's', 'sec': 's', 'second': 's', 'seconds': 's',
    'min': 'min', 'minute': 'min', 'minutes': 'min',
    'h': 'h', 'hr': 'h', 'hour': 'h', 'hours': 'h',
    'd': 'd', 'day': 'd', 'days': 'd',
    'wk': 'wk', 'week': 'wk', 'weeks': 'wk',
    'mo': 'mo', 'month': 'mo', 'months': 'mo',
    'yr': 'yr', 'year': 'yr', 'years': 'yr',
    'decade': 'decade', 'decades': 'decade',
    'century': 'century', 'centuries': 'century',

    // Temperature
    '°C': '°C', 'celsius': '°C', 'degC': '°C',
    '°F': '°F', 'fahrenheit': '°F', 'degF': '°F',
    'K': 'K', 'kelvin': 'K', 'degK': 'K',

    // Speed
    'mps': 'm/s', 'm/s': 'm/s', 'meters-per-second': 'm/s',
    'kph': 'km/h', 'km/h': 'km/h', 'kilometers-per-hour': 'km/h',
    'mph': 'mi/h', 'mi/h': 'mi/h', 'miles-per-hour': 'mi/h',
    'knot': 'knot', 'knots': 'knot', 'kt': 'knot',

    // Area
    'm²': 'm²', 'sq-m': 'm²', 'square-meter': 'm²',
    'km²': 'km²', 'sq-km': 'km²', 'square-kilometer': 'km²',
    'ha': 'ha', 'hectare': 'ha', 'hectares': 'ha',
    'a': 'a', 'are': 'a', 'ares': 'a',
    'ft²': 'ft²', 'sq-ft': 'ft²', 'square-foot': 'ft²',
    'mi²': 'mi²', 'sq-mi': 'mi²', 'square-mile': 'mi²',
    'acre': 'acre', 'acres': 'acre',

    // Energy
    'J': 'J', 'joule': 'J', 'joules': 'J',
    'kJ': 'kJ', 'kilojoule': 'kJ', 'kilojoules': 'kJ',
    'cal': 'cal', 'calorie': 'cal', 'calories': 'cal',
    'kcal': 'kcal', 'kilocalorie': 'kcal',
    'Wh': 'Wh', 'watt-hour': 'Wh',
    'kWh': 'kWh', 'kilowatt-hour': 'kWh',

    // Power
    'W': 'W', 'watt': 'W', 'watts': 'W',
    'kW': 'kW', 'kilowatt': 'kW', 'kilowatts': 'kW',
    'MW': 'MW', 'megawatt': 'MW', 'megawatts': 'MW',
    'hp': 'hp', 'horsepower': 'hp',

    // Pressure
    'Pa': 'Pa', 'pascal': 'Pa', 'pascals': 'Pa',
    'kPa': 'kPa', 'kilopascal': 'kPa',
    'bar': 'bar', 'bars': 'bar',
    'psi': 'psi', 'pound-per-square-inch': 'psi',
    'atm': 'atm', 'atmosphere': 'atm', 'atmospheres': 'atm',

    // Frequency
    'Hz': 'Hz', 'hertz': 'Hz',
    'kHz': 'kHz', 'kilohertz': 'kHz',
    'MHz': 'MHz', 'megahertz': 'MHz',
    'GHz': 'GHz', 'gigahertz': 'GHz',
};

// Conversion factors to base units (SI where possible)
const CONVERSIONS: Record<string, number> = {
    // Distance (base: m)
    'm': 1,
    'km': 1000,
    'cm': 0.01,
    'mm': 0.001,
    'μm': 1e-6,
    'nm': 1e-9,
    'in': 0.0254,
    'ft': 0.3048,
    'yd': 0.9144,
    'mi': 1609.344,
    'nmi': 1852,
    'au': 149597870700, // astronomical unit
    'ly': 9.4607304725808e15, // light year
    'pc': 3.08567758149137e16, // parsec

    // Mass (base: kg)
    'kg': 1,
    'g': 0.001,
    'mg': 1e-6,
    'μg': 1e-9,
    'lb': 0.45359237,
    'oz': 0.028349523125,
    'ton': 907.18474, // US short ton
    'stone': 6.35029318,

    // Volume (base: l)
    'l': 1,
    'ml': 0.001,
    'cl': 0.01,
    'hl': 100,
    'tsp': 0.00492892159375, // US teaspoon
    'tbsp': 0.01478676478125, // US tablespoon
    'floz': 0.0295735295625, // US fluid ounce
    'cup': 0.24, // US cup (rounded to 240ml)
    'pt': 0.473176473, // US pint
    'qt': 0.946352946, // US quart
    'gal': 3.785411784, // US gallon

    // Time (base: s)
    's': 1,
    'min': 60,
    'h': 3600,
    'd': 86400,
    'wk': 604800,
    'mo': 2629800, // approx 1 month (30.44 days)
    'yr': 31557600, // approx 1 year (365.25 days)
    'decade': 315576000, // 10 years
    'century': 3155760000, // 100 years

    // Temperature (special conversion - not linear)
    // These are handled separately in the conversion function

    // Area (base: m²)
    'm²': 1,
    'km²': 1000000,
    'ha': 10000,
    'a': 100,
    'ft²': 0.09290304,
    'mi²': 2589988.110336,
    'acre': 4046.8564224,

    // Energy (base: J)
    'J': 1,
    'kJ': 1000,
    'cal': 4.184,
    'kcal': 4184,
    'Wh': 3600,
    'kWh': 3600000,

    // Power (base: W)
    'W': 1,
    'kW': 1000,
    'MW': 1000000,
    'hp': 745.699872, // mechanical horsepower

    // Pressure (base: Pa)
    'Pa': 1,
    'kPa': 1000,
    'bar': 100000,
    'psi': 6894.75729,
    'atm': 101325,

    // Frequency (base: Hz)
    'Hz': 1,
    'kHz': 1000,
    'MHz': 1000000,
    'GHz': 1000000000,
};

// Unit categories for semantic type determination
const CATEGORIES: Record<string, string> = {
    // Distance
    'm': 'distance', 'km': 'distance', 'cm': 'distance', 'mm': 'distance', 'μm': 'distance', 'nm': 'distance',
    'in': 'distance', 'ft': 'distance', 'yd': 'distance', 'mi': 'distance', 'nmi': 'distance',
    'au': 'distance', 'ly': 'distance', 'pc': 'distance',

    // Mass
    'kg': 'mass', 'g': 'mass', 'mg': 'mass', 'μg': 'mass',
    'lb': 'mass', 'oz': 'mass', 'ton': 'mass', 'stone': 'mass',

    // Volume
    'l': 'volume', 'ml': 'volume', 'cl': 'volume', 'hl': 'volume',
    'tsp': 'volume', 'tbsp': 'volume', 'floz': 'volume', 'cup': 'volume', 'pt': 'volume', 'qt': 'volume', 'gal': 'volume',

    // Time
    's': 'time', 'min': 'time', 'h': 'time', 'd': 'time', 'wk': 'time', 'mo': 'time', 'yr': 'time',
    'decade': 'time', 'century': 'time',

    // Temperature
    '°C': 'temperature', '°F': 'temperature', 'K': 'temperature',

    // Area
    'm²': 'area', 'km²': 'area', 'ha': 'area', 'a': 'area',
    'ft²': 'area', 'mi²': 'area', 'acre': 'area',

    // Energy
    'J': 'energy', 'kJ': 'energy', 'cal': 'energy', 'kcal': 'energy', 'Wh': 'energy', 'kWh': 'energy',

    // Power
    'W': 'power', 'kW': 'power', 'MW': 'power', 'hp': 'power',

    // Pressure
    'Pa': 'pressure', 'kPa': 'pressure', 'bar': 'pressure', 'psi': 'pressure', 'atm': 'pressure',

    // Frequency
    'Hz': 'frequency', 'kHz': 'frequency', 'MHz': 'frequency', 'GHz': 'frequency',

    // Speed
    'm/s': 'speed', 'km/h': 'speed', 'mi/h': 'speed', 'knot': 'speed',

    // Currency
    'USD': 'currency', 'EUR': 'currency', 'GBP': 'currency', 'JPY': 'currency', 'INR': 'currency',
    'CHF': 'currency', 'CAD': 'currency', 'AUD': 'currency', 'NZD': 'currency',
    'CNY': 'currency', 'KRW': 'currency', 'RUB': 'currency',
    'BTC': 'currency', 'sats': 'currency', 'ETH': 'currency'
};

// Define unit categories for semantic type determination
const TIME_UNITS = ['s', 'min', 'h', 'd', 'wk', 'mo', 'yr', 'decade', 'century', 'second', 'minute', 'hour', 'day', 'week', 'month', 'year', 'decades', 'centuries'];
const DISTANCE_UNITS = ['m', 'km', 'cm', 'mm', 'μm', 'nm', 'in', 'ft', 'yd', 'mi', 'nmi', 'au', 'ly', 'pc', 'meter', 'kilometer', 'centimeter', 'millimeter', 'micrometer', 'nanometer', 'inch', 'foot', 'feet', 'yard', 'mile', 'miles', 'nautical-mile'];
const MASS_UNITS = ['kg', 'g', 'mg', 'μg', 'lb', 'oz', 'ton', 'stone', 'kilogram', 'gram', 'milligram', 'microgram', 'pound', 'ounce', 'tons'];
const VOLUME_UNITS = ['l', 'ml', 'cl', 'hl', 'tsp', 'tbsp', 'floz', 'cup', 'pt', 'qt', 'gal', 'liter', 'milliliter', 'centiliter', 'hectoliter', 'teaspoon', 'tablespoon', 'fluid-ounce', 'pint', 'quart', 'gallon'];
const AREA_UNITS = ['m²', 'km²', 'ha', 'a', 'ft²', 'mi²', 'acre', 'square-meter', 'square-kilometer', 'hectare', 'are', 'square-foot', 'square-mile', 'acres'];
const ENERGY_UNITS = ['J', 'kJ', 'cal', 'kcal', 'Wh', 'kWh', 'joule', 'kilojoule', 'calorie', 'kilocalorie', 'watt-hour', 'kilowatt-hour'];
const POWER_UNITS = ['W', 'kW', 'MW', 'hp', 'watt', 'kilowatt', 'megawatt', 'horsepower'];
const PRESSURE_UNITS = ['Pa', 'kPa', 'bar', 'psi', 'atm', 'pascal', 'kilopascal', 'bar', 'pound-per-square-inch', 'atmosphere'];
const FREQUENCY_UNITS = ['Hz', 'kHz', 'MHz', 'GHz', 'hertz', 'kilohertz', 'megahertz', 'gigahertz'];
const SPEED_UNITS = ['m/s', 'km/h', 'mi/h', 'knot', 'meters-per-second', 'kilometers-per-hour', 'miles-per-hour', 'knots'];
const TEMPERATURE_UNITS = ['°C', '°F', 'K', 'celsius', 'fahrenheit', 'kelvin'];

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
