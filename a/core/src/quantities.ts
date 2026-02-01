
export interface Quantity {
    value: number;
    unit: string;
}

// === DIMENSIONAL ANALYSIS SYSTEM ===

// Base Dimensions
const LENGTH = 0;
const MASS = 1;
const TIME = 2;
const CURRENT = 3;
const TEMP = 4;
const AMOUNT = 5;
const LUMINOUS = 6;
const CURRENCY = 7;
const DATA = 8;

const DIMENSION_NAMES = [
    'length', 'mass', 'time', 'current', 'temperature', 'amount', 'luminous', 'currency', 'data'
];

type Dimensions = number[]; // Vector of dimension exponents

interface UnitDef {
    factor: number;    // Multiplier to base unit
    offset: number;    // Additive offset (for temperature)
    dimensions: Dimensions;
}

const BASE_DIMS = (idx: number): Dimensions => {
    const d = new Array(9).fill(0);
    d[idx] = 1;
    return d;
};

// Registry of units
// Base units: m, kg, s, A, K, mol, cd, USD, bit
const UNITS: Record<string, UnitDef> = {};

const register = (
    name: string,
    factor: number,
    dims: Dimensions,
    offset = 0,
    aliases: string[] = []
) => {
    const def = { factor, offset, dimensions: dims };
    UNITS[name] = def;
    aliases.forEach(a => UNITS[a] = def);
};

// --- LENGTH (m) ---
const D_LENGTH = BASE_DIMS(LENGTH);
register('m', 1, D_LENGTH, 0, ['meter', 'meters']);
register('km', 1000, D_LENGTH, 0, ['kilometer', 'kilometers']);
register('cm', 0.01, D_LENGTH, 0, ['centimeter', 'centimeters']);
register('mm', 0.001, D_LENGTH, 0, ['millimeter', 'millimeters']);
register('mi', 1609.344, D_LENGTH, 0, ['mile', 'miles']);
register('ft', 0.3048, D_LENGTH, 0, ['foot', 'feet', "'"]);
register('in', 0.0254, D_LENGTH, 0, ['inch', 'inches', '"']);
register('yd', 0.9144, D_LENGTH, 0, ['yard', 'yards']);

// --- MASS (kg) ---
const D_MASS = BASE_DIMS(MASS);
register('kg', 1, D_MASS, 0, ['kilogram', 'kilograms']);
register('g', 0.001, D_MASS, 0, ['gram', 'grams']);
register('mg', 0.000001, D_MASS, 0, ['milligram', 'milligrams']);
register('lb', 0.45359237, D_MASS, 0, ['lbs', 'pound', 'pounds']);
register('oz', 0.028349523125, D_MASS, 0, ['ounce', 'ounces']); // standard oz (avoirdupois)

// --- TIME (s) ---
const D_TIME = BASE_DIMS(TIME);
register('s', 1, D_TIME, 0, ['sec', 'second', 'seconds']);
register('min', 60, D_TIME, 0, ['minute', 'minutes']);
register('h', 3600, D_TIME, 0, ['hr', 'hour', 'hours']);
register('d', 86400, D_TIME, 0, ['day', 'days']);
register('wk', 604800, D_TIME, 0, ['week', 'weeks']);
register('mo', 2629746, D_TIME, 0, ['month', 'months']); // 1/12 of 365.2425 days
register('yr', 31556952, D_TIME, 0, ['year', 'years']); // 365.2425 days

// --- TEMPERATURE (K) ---
const D_TEMP = BASE_DIMS(TEMP);
register('K', 1, D_TEMP, 0, ['kelvin']);
register('C', 1, D_TEMP, 273.15, ['celsius', 'centigrade']); // offset handled specially? 0C = 273.15K.
// To convert T_C to T_K: T_K = T_C + 273.15. factor=1.
// To convert T_F to T_K: T_K = (T_F - 32) * 5/9 + 273.15 = T_F * 5/9 + 255.372222...
// Exact offset: 273.15 - 32 * 5/9 = 273.15 - 17.777... = 255.372222...
register('F', 5/9, D_TEMP, 255.37222222, ['fahrenheit']);

// --- CURRENT (A) ---
const D_CURRENT = BASE_DIMS(CURRENT);
register('A', 1, D_CURRENT, 0, ['amp', 'ampere', 'amperes']);
register('mA', 0.001, D_CURRENT, 0, ['milliamp']);

// --- AMOUNT (mol) ---
const D_AMOUNT = BASE_DIMS(AMOUNT);
register('mol', 1, D_AMOUNT, 0, ['mole', 'moles']);

// --- LUMINOUS (cd) ---
const D_LUMINOUS = BASE_DIMS(LUMINOUS);
register('cd', 1, D_LUMINOUS, 0, ['candela']);

// --- CURRENCY (USD - base for relative comparison only) ---
const D_CURRENCY = BASE_DIMS(CURRENCY);
register('USD', 1, D_CURRENCY, 0, ['$', 'dollar', 'dollars', 'us dollar']);
register('EUR', 1.0, D_CURRENCY, 0, ['€', 'euro', 'euros', 'eur']); // Mock exchange rate 1:1 for simplicity
register('GBP', 1.0, D_CURRENCY, 0, ['£', 'pound sterling', 'gbp']);
register('BTC', 1.0, D_CURRENCY, 0, ['bitcoin']);
register('sats', 0.00000001, D_CURRENCY, 0, ['satoshi', 'satoshis']);

// --- DATA (bit) ---
const D_DATA = BASE_DIMS(DATA);
register('bit', 1, D_DATA, 0, ['b', 'bits']);
register('B', 8, D_DATA, 0, ['byte', 'bytes']);
register('KB', 8 * 1024, D_DATA, 0, ['kilobyte', 'kb']);
register('MB', 8 * 1024**2, D_DATA, 0, ['megabyte', 'mb']);
register('GB', 8 * 1024**3, D_DATA, 0, ['gigabyte', 'gb']);
register('TB', 8 * 1024**4, D_DATA, 0, ['terabyte', 'tb']);

// --- DERIVED UNITS (Common aliases) ---
// Force: N = kg m / s^2
const D_FORCE = [0, 1, -2, 0, 0, 0, 0, 0, 0]; // order: L, M, T...
D_FORCE[LENGTH] = 1; D_FORCE[MASS] = 1; D_FORCE[TIME] = -2;
register('N', 1, D_FORCE, 0, ['newton', 'newtons']);

// Energy: J = N m = kg m^2 / s^2
const D_ENERGY = [...D_FORCE]; D_ENERGY[LENGTH] += 1;
register('J', 1, D_ENERGY, 0, ['joule', 'joules']);
register('kJ', 1000, D_ENERGY, 0, ['kilojoule']);
register('cal', 4.184, D_ENERGY, 0, ['calorie', 'calories']);
register('kcal', 4184, D_ENERGY, 0, ['kilocalorie', 'Cal']);
register('Wh', 3600, D_ENERGY, 0, ['watt-hour']);
register('kWh', 3.6e6, D_ENERGY, 0, ['kilowatt-hour']);

// Power: W = J/s = kg m^2 / s^3
const D_POWER = [...D_ENERGY]; D_POWER[TIME] -= 1;
register('W', 1, D_POWER, 0, ['watt', 'watts']);
register('kW', 1000, D_POWER, 0, ['kilowatt']);
register('hp', 745.7, D_POWER, 0, ['horsepower']);

// Volume: L = dm^3 = 0.001 m^3
const D_VOLUME = [0, 0, 0, 0, 0, 0, 0, 0, 0]; D_VOLUME[LENGTH] = 3;
register('L', 0.001, D_VOLUME, 0, ['liter', 'liters', 'l']);
register('mL', 0.000001, D_VOLUME, 0, ['milliliter', 'ml']);
register('gal', 0.00378541, D_VOLUME, 0, ['gallon', 'gallons']); // US liquid gallon

// Pressure: Pa = N/m^2 = kg / (m s^2)
const D_PRESSURE = [0, 0, 0, 0, 0, 0, 0, 0, 0];
D_PRESSURE[MASS] = 1; D_PRESSURE[LENGTH] = -1; D_PRESSURE[TIME] = -2;
register('Pa', 1, D_PRESSURE, 0, ['pascal']);
register('bar', 100000, D_PRESSURE, 0, []);
register('psi', 6894.76, D_PRESSURE, 0, []);

// --- PARSING ---

export const parseQuantity = (text: string): Quantity | null => {
    if (!text) return null;
    const clean = text.trim();

    // Regex handles:
    // $100
    // 100 km
    // 100 km/h
    // 100 kW h

    // 1. Currency prefix ($100, £50)
    const prefixMatch = clean.match(/^([$€£])\s*([\d,\.]+)\s*(.*)$/);
    if (prefixMatch) {
        const symbol = prefixMatch[1];
        const valStr = prefixMatch[2].replace(/,/g, '');
        const suffix = prefixMatch[3] ? prefixMatch[3].trim() : '';
        const val = parseFloat(valStr);
        if (isNaN(val)) return null;

        // Map symbol to canonical code
        let baseUnitStr = 'USD';
        if (symbol === '€') baseUnitStr = 'EUR';
        if (symbol === '£') baseUnitStr = 'GBP';

        // Clean suffix (remove / or per)
        const cleanSuffix = suffix.replace(/^\/|^per\s+/, '').trim();
        const unitStr = cleanSuffix ? `${baseUnitStr}/${cleanSuffix}` : baseUnitStr;

        return { value: val, unit: unitStr };
    }

    // 2. Standard suffix
    const suffixMatch = clean.match(/^([\d,\.]+)\s*([a-zA-Z\/\$€£\*\s%\^]+)$/);
    if (suffixMatch) {
        const valStr = suffixMatch[1].replace(/,/g, '');
        const rawUnit = suffixMatch[2].trim();
        const val = parseFloat(valStr);
        if (isNaN(val)) return null;

        return { value: val, unit: rawUnit };
    }

    // 3. Just number (unitless)
    const val = parseFloat(clean.replace(/,/g, ''));
    if (!isNaN(val) && isFinite(val) && String(val) === clean.replace(/,/g, '')) {
         return { value: val, unit: '' };
    }

    return null;
};

// --- ANALYSIS & COMPARISON ---

interface ResolvedQuantity {
    baseValue: number;
    dimensions: Dimensions;
    isValid: boolean;
}

const resolveUnit = (unitStr: string): ResolvedQuantity => {
    // Splits by / first (division)
    const parts = unitStr.split('/');
    const numeratorStr = parts[0];
    const denominatorStr = parts.slice(1).join(' '); // Treat subsequent parts as denominators? Actually a/b/c is ambiguous (a/(bc) or (a/b)/c). Assuming a/b only for now or strict left associative.

    // Simplify: Only one level of division supported for simplicity in regex parsing of user input usually.
    // But let's handle "a b / c d" correctly.

    const resolveTerm = (term: string): { factor: number, offset: number, dims: Dimensions } => {
        // Split by space or *
        const subTerms = term.split(/[\*\s]+/).filter(t => t.length > 0);
        let totalFactor = 1;
        let totalOffset = 0; // Offset only applies if single unit. Compound units with offset is invalid physics usually (degC * m ??).
        const totalDims = new Array(9).fill(0);

        for (const t of subTerms) {
            const def = UNITS[t] || UNITS[t.toLowerCase()] || UNITS[t.replace(/s$/, '')]; // simplistic singularization
            if (def) {
                totalFactor *= def.factor;
                // Accumulate dimensions
                for (let i = 0; i < 9; i++) totalDims[i] += def.dimensions[i];

                // Offset handling: Only valid if it's the ONLY term in the entire unit expression
                // We'll handle offset at the top level check.
            } else {
                // Unknown unit - make it a custom dimension?
                // For now, return invalid
                return { factor: NaN, offset: NaN, dims: [] };
            }
        }
        return { factor: totalFactor, offset: 0, dims: totalDims };
    };

    // Handle Numerator
    const num = resolveTerm(numeratorStr);
    if (isNaN(num.factor)) return { baseValue: NaN, dimensions: [], isValid: false };

    // Handle Denominator
    let denFactor = 1;
    const denDims = new Array(9).fill(0);

    if (denominatorStr) {
        // Denominator terms
        // e.g. "km/h" -> num=km, den=h
        // e.g. "m/s/s" -> num=m, den=s s?
        // Let's assume split by / gives [num, den1, den2...] which are all divisors.
        // Actually earlier split was `parts`.
        for (let i = 1; i < parts.length; i++) {
            const d = resolveTerm(parts[i]);
            if (isNaN(d.factor)) return { baseValue: NaN, dimensions: [], isValid: false };
            denFactor *= d.factor;
            for (let k = 0; k < 9; k++) denDims[k] += d.dims[k];
        }
    }

    const finalFactor = num.factor / denFactor;
    const finalDims = num.dims.map((v, i) => v - denDims[i]);

    // Offset special case check:
    // Only apply offset if: no denominator, only 1 subterm in numerator, and unit has offset.
    // e.g. "100 C".
    // We return baseValue relative to 0 of base unit.
    // This function returns unit properties, not value.
    // So we need to return the transform function?

    return {
        baseValue: finalFactor, // This is just the multiplicative factor.
        dimensions: finalDims,
        isValid: true
    };
};

const toBaseValue = (val: number, unitStr: string): { value: number, dims: Dimensions, valid: boolean } => {
    if (!unitStr) return { value: val, dims: new Array(9).fill(0), valid: true }; // Unitless

    // Special Check for Temperature (Offset)
    // If unitStr is exactly "C", "F", "degC", etc.
    const clean = unitStr.trim();
    if (UNITS[clean] && UNITS[clean].offset !== 0) {
        // Single unit with offset
        const def = UNITS[clean];
        // Value = (val + offset_if_needed? No, usually T_base = T_val * factor + offset)
        // K = C + 273.15. factor=1, offset=273.15.
        // K = (F - 32)*5/9 + 273.15. Not linear.
        // My registry has F: factor=5/9, offset=255.372.
        // T_K = T_F * 5/9 + 255.372.
        return {
            value: val * def.factor + def.offset,
            dims: def.dimensions,
            valid: true
        };
    }

    const res = resolveUnit(unitStr);
    if (!res.isValid) return { value: NaN, dims: [], valid: false };

    return {
        value: val * res.baseValue,
        dims: res.dimensions,
        valid: true
    };
};

export const compareQuantities = (a: Quantity, b: Quantity): number | null => {
    const baseA = toBaseValue(a.value, a.unit);
    const baseB = toBaseValue(b.value, b.unit);

    if (!baseA.valid || !baseB.valid) return null;

    // Check dimensions equality
    for (let i = 0; i < 9; i++) {
        if (baseA.dims[i] !== baseB.dims[i]) return null; // Incompatible dimensions
    }

    // Compare base values
    const diff = baseA.value - baseB.value;
    // Increased epsilon for temperature conversions which accumulate more error
    const epsilon = 1e-5;

    if (Math.abs(diff) < epsilon) return 0;
    return diff > 0 ? 1 : -1;
};

export const getDimensionName = (dims: Dimensions): string | null => {
    // Reverse lookup commonly used dimensions
    // e.g. [0,1,0...] -> 'mass'

    // Check base dimensions
    for(let i=0; i<9; i++) {
        if (dims[i] === 1 && dims.reduce((a,b)=>a+Math.abs(b),0) === 1) return DIMENSION_NAMES[i];
    }

    // Check derived signatures?
    // Speed: L=1, T=-1
    if (dims[LENGTH]===1 && dims[TIME]===-1 && sumAbs(dims)===2) return 'speed';
    // Acceleration: L=1, T=-2
    if (dims[LENGTH]===1 && dims[TIME]===-2 && sumAbs(dims)===3) return 'acceleration';
    // Force: M=1, L=1, T=-2
    if (dims[MASS]===1 && dims[LENGTH]===1 && dims[TIME]===-2 && sumAbs(dims)===4) return 'force';
    // Energy: M=1, L=2, T=-2
    if (dims[MASS]===1 && dims[LENGTH]===2 && dims[TIME]===-2 && sumAbs(dims)===5) return 'energy';
    // Power: M=1, L=2, T=-3
    if (dims[MASS]===1 && dims[LENGTH]===2 && dims[TIME]===-3 && sumAbs(dims)===6) return 'power';
    // Volume: L=3
    if (dims[LENGTH]===3 && sumAbs(dims)===3) return 'volume';
    // Area: L=2
    if (dims[LENGTH]===2 && sumAbs(dims)===2) return 'area';

    return null; // Unknown complex dimension
};

const sumAbs = (arr: number[]) => arr.reduce((a,b) => a + Math.abs(b), 0);
