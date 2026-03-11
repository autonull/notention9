import type { PropertyType } from '../types/index.js';

const ISODATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;

interface TypeCounts {
  number: number;
  date: number;
}

export const inferPropertyType = (_key: string, values: unknown[]): PropertyType => {
  if (!values?.length) return 'string';

  const counts = values.reduce<TypeCounts>((acc, v) => {
    if (typeof v === 'number') {
      acc.number++;
    } else {
      const valStr = String(v);
      if (!Number.isNaN(Number.parseFloat(valStr))) acc.number++;
      if (ISODATE_REGEX.test(valStr) && !Number.isNaN(Date.parse(valStr))) acc.date++;
    }
    return acc;
  }, { number: 0, date: 0 });

  const threshold = values.length * 0.8;
  if (counts.number >= threshold) return 'number';
  if (counts.date >= threshold) return 'date';

  return 'string';
};
