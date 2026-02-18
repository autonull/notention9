import type { PropertyType } from '../types/index.js';

const ISODATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;

interface TypeCounts {
    number: number;
    date: number;
}

/**
 * Infer type of a property based on its values
 */
export function inferPropertyType(key: string, values: unknown[]): PropertyType {
    if (!values?.length) return 'string' as PropertyType;

    const initialCounts: TypeCounts = { number: 0, date: 0 };

    const counts = values.reduce((acc: TypeCounts, v: unknown) => {
        if (typeof v === 'number') {
            acc.number++;
        } else {
            const valStr = String(v);
            if (!isNaN(parseFloat(valStr))) acc.number++;
            if (ISODATE_REGEX.test(valStr) && !isNaN(Date.parse(valStr))) acc.date++;
        }
        return acc;
    }, initialCounts);

    const threshold = values.length * 0.8; // 80% confidence
    if (counts.number >= threshold) return 'number' as PropertyType;
    if (counts.date >= threshold) return 'date' as PropertyType;

    return 'string' as PropertyType;
}
