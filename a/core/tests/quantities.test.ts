import { describe, it, expect } from 'vitest';
import { parseQuantity, compareQuantities } from '../src/quantities';

describe('Quantities (Dimensional Analysis)', () => {
    describe('parseQuantity', () => {
        it('parses simple units', () => {
            expect(parseQuantity('100 m')).toEqual({ value: 100, unit: 'm' });
            expect(parseQuantity('10.5 kg')).toEqual({ value: 10.5, unit: 'kg' });
        });

        it('parses currency', () => {
            expect(parseQuantity('$100')).toEqual({ value: 100, unit: 'USD' });
            expect(parseQuantity('100 USD')).toEqual({ value: 100, unit: 'USD' });
        });

        it('parses rates (division)', () => {
            expect(parseQuantity('100 km/h')).toEqual({ value: 100, unit: 'km/h' });
            expect(parseQuantity('$100/hr')).toEqual({ value: 100, unit: 'USD/hr' });
            expect(parseQuantity('50 m/s')).toEqual({ value: 50, unit: 'm/s' });
        });

        it('parses multiplications', () => {
            expect(parseQuantity('100 N*m')).toEqual({ value: 100, unit: 'N*m' });
            expect(parseQuantity('5 kW h')).toEqual({ value: 5, unit: 'kW h' });
        });

        it('parses temperature with offset', () => {
            expect(parseQuantity('100 C')).toEqual({ value: 100, unit: 'C' });
            expect(parseQuantity('32 F')).toEqual({ value: 32, unit: 'F' });
        });

        it('parses data units', () => {
             expect(parseQuantity('100 MB')).toEqual({ value: 100, unit: 'MB' });
             expect(parseQuantity('1 TB')).toEqual({ value: 1, unit: 'TB' });
        });
    });

    describe('compareQuantities', () => {
        it('compares identical units', () => {
            const q1 = { value: 10, unit: 'm' };
            const q2 = { value: 5, unit: 'm' };
            expect(compareQuantities(q1, q2)).toBe(1);
        });

        it('compares convertible simple units', () => {
            const q1 = { value: 1, unit: 'km' };
            const q2 = { value: 500, unit: 'm' }; // 1km = 1000m > 500m
            expect(compareQuantities(q1, q2)).toBe(1);
        });

        it('compares convertible rates', () => {
            const q1 = { value: 100, unit: 'km/h' };
            const q2 = { value: 20, unit: 'm/s' };
            // 100 km/h = 27.77 m/s > 20 m/s
            expect(compareQuantities(q1, q2)).toBe(1);
        });

        it('compares energy (J vs kW h)', () => {
             const q1 = { value: 1, unit: 'kWh' }; // 3.6 MJ
             const q2 = { value: 3000, unit: 'kJ' }; // 3.0 MJ
             expect(compareQuantities(q1, q2)).toBe(1);
        });

        it('compares temperature (offset)', () => {
            const q1 = { value: 0, unit: 'C' }; // 273.15 K
            const q2 = { value: 32, unit: 'F' }; // 273.15 K
            // 0C == 32F
            expect(compareQuantities(q1, q2)).toBe(0);

            const q3 = { value: 100, unit: 'C' }; // 373.15 K
            const q4 = { value: 212, unit: 'F' }; // 373.15 K
            expect(compareQuantities(q3, q4)).toBe(0);
        });

        it('compares data units', () => {
            const q1 = { value: 1, unit: 'KB' };
            const q2 = { value: 1024, unit: 'B' };
            expect(compareQuantities(q1, q2)).toBe(0);
        });

        it('enforces dimensional integrity', () => {
             // Length vs Time -> null
             const q1 = { value: 100, unit: 'm' };
             const q2 = { value: 100, unit: 's' };
             expect(compareQuantities(q1, q2)).toBeNull();

             // Energy vs Power -> null
             const q3 = { value: 100, unit: 'J' };
             const q4 = { value: 100, unit: 'W' };
             expect(compareQuantities(q3, q4)).toBeNull();

             // Speed vs Acceleration -> null
             const q5 = { value: 10, unit: 'm/s' };
             const q6 = { value: 10, unit: 'm/s/s' }; // m/s^2? 'm' 's' 's' -> L T^-2
             // Note: parser handles 'm/s/s' as m / (s*s) if naive?
             // My parser: m (num), s (den), s (den). -> L T^-2. Correct.
             expect(compareQuantities(q5, q6)).toBeNull();
        });

        it('handles complex derived comparisons', () => {
            // Force: N = kg m / s^2
            const q1 = { value: 1, unit: 'N' };
            const q2 = { value: 1, unit: 'kg m/s/s' };
            // My parser for 'kg m/s/s': num='kg m', den='s', den='s'.
            // kg m -> M * L. den -> T * T. -> MLT^-2.
            expect(compareQuantities(q1, q2)).toBe(0);
        });
    });
});
