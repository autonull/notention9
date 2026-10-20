import { CONVERSIONS, CATEGORIES } from '../../../data/units/index.js';

export const getConversionFactor = (from: string, to: string): number | null => {
  if (from === to) return 1;
  const catA = CATEGORIES[from];
  const catB = CATEGORIES[to];

  if (!catA || !catB || catA !== catB || catA === 'currency' || catA === 'temperature') return null;

  const rateA = CONVERSIONS[from];
  const rateB = CONVERSIONS[to];
  return (rateA && rateB) ? rateA / rateB : null;
};

export const convertLinear = (value: number, from: string, to: string): number | null => {
  const factor = getConversionFactor(from, to);
  return factor !== null ? value * factor : null;
};