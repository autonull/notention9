import { Property } from '@notention/core';

export const p = (key: string, operator: string, ...values: string[]): Property => ({
    key, operator, values
});

export function randomElement<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function randomElements<T>(arr: readonly T[], count: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

export const ROLES = ['Developer', 'Designer', 'Client', 'Manager', 'Analyst'] as const;
export type Role = typeof ROLES[number];

export const SKILLS = ['react', 'typescript', 'python', 'design', 'management', 'sql', 'figma'] as const;
export type Skill = typeof SKILLS[number];

export const LOCATIONS = ['Remote', 'New York', 'London', 'Berlin', 'San Francisco'] as const;
export type Location = typeof LOCATIONS[number];

export const INPUT_METHODS = ['raw', 'autocomplete', 'form'] as const;
export type InputMethodType = typeof INPUT_METHODS[number];