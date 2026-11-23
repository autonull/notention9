import {format, isValid, parseISO} from 'date-fns';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const COORDINATES = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
const ONTOLOGY_PATH = /^[\p{L}\p{N}._-]+(?:\/[\p{L}\p{N}._-]+)+$/u;
const ONTOLOGY_PATH_LIST = /^[\p{L}\p{N}._-]+(?:\/[\p{L}\p{N}._-]+)+(?:\s*,\s*[\p{L}\p{N}._-]+(?:\/[\p{L}\p{N}._-]+)+)+$/u;

const leaf = (path: string): string =>
    (path.split('/').filter(Boolean).at(-1) ?? path).replace(/[-_]/g, ' ');

const decimal = (value: number): string =>
    value.toFixed(3).replace(/\.?0+$/, '');

/**
 * A detail value reads like a value, not like storage. Dates, coordinates,
 * and ontology paths are shortened for display only; the editor keeps the raw.
 */
export function formatPropertyValue(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';

    const coordinate = COORDINATES.exec(trimmed);
    if (coordinate) {
        const latitude = Number(coordinate[1]);
        const longitude = Number(coordinate[2]);
        if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
            return `${decimal(latitude)}, ${decimal(longitude)}`;
        }
    }

    if (ISO_DATE.test(trimmed)) {
        const date = parseISO(trimmed);
        if (isValid(date)) {
            return format(date, trimmed.length === 10 ? 'd MMM yyyy' : 'd MMM yyyy, HH:mm');
        }
    }

    if (ONTOLOGY_PATH_LIST.test(trimmed)) {
        return trimmed.split(/\s*,\s*/).map(leaf).join(', ');
    }

    if (ONTOLOGY_PATH.test(trimmed)) return leaf(trimmed);

    return trimmed.replace(/_/g, ' ');
}

export function formatPropertyValues(values: string[]): string {
    return values.map(formatPropertyValue).filter(Boolean).join(', ');
}

export function formatPropertyRange(values: string[]): string {
    return values.map(formatPropertyValue).filter(Boolean).join('–');
}
