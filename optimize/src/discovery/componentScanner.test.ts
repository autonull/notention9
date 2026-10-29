import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComponentScanner } from './componentScanner.js';
import { TsAstScanner } from './tsAstScanner.js';
import { DEFAULT_PROJECT_ROOT } from './astProject.js';

let root: string;

function write(relativePath: string, contents: string): void {
    const file = join(root, relativePath);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, contents);
}

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'notention-discovery-'));
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

interface JSXElementLike {
    tag: string;
    props: Record<string, string>;
    children: JSXElementLike[];
    location: { line: number; column: number };
}

function findJsx(elements: JSXElementLike[], tag: string): JSXElementLike | undefined {
    for (const element of elements) {
        if (element.tag === tag) return element;
        const nested = findJsx(element.children, tag);
        if (nested) return nested;
    }
    return undefined;
}

describe('ComponentScanner', () => {
    it('reads props, inherited props, hooks, exports and JSX from the AST', () => {
        write('ui/src/Fixture.tsx', `
import { useEffect, useState } from 'react';

interface BaseProps {
    id: string;
}

interface FixtureProps extends BaseProps {
    title: string;
    count?: number;
    onClick: () => void;
}

export function Fixture({ title, count, onClick }: FixtureProps) {
    const [value, setValue] = useState(0);
    useEffect(() => setValue(1), []);
    const notACall = "useFake";
    return (
        <div>
            <Button aria-label="Do it" onClick={onClick}>
                <span>Do it</span>
            </Button>
            <Modal title="M" open={true} />
        </div>
    );
}
`);

        const result = new ComponentScanner().scan(root);
        expect(result.components).toHaveLength(1);

        const fixture = result.components[0];
        expect(fixture.name).toBe('Fixture');
        expect(fixture.exports).toContain('Fixture');

        expect(fixture.props).toEqual([
            { name: 'title', type: 'string', optional: false },
            { name: 'count', type: 'number', optional: true },
            { name: 'onClick', type: '() => void', optional: false },
            { name: 'id', type: 'string', optional: false },
        ]);

        expect(fixture.hooks.sort()).toEqual(['useEffect', 'useState']);

        const button = findJsx(fixture.jsx, 'Button');
        expect(button?.props).toMatchObject({ 'aria-label': 'Do it' });
        expect(button?.children.map(child => child.tag)).toContain('span');

        const modal = findJsx(fixture.jsx, 'Modal');
        expect(modal?.props).toMatchObject({ title: 'M', open: 'true' });
        expect(modal?.location.line).toBeGreaterThan(0);
    });

    it('resolves props from a React.FC type argument and a type-literal alias', () => {
        write('ui/src/Also.tsx', `
import type { FC } from 'react';

type AlsoProps = {
    x: boolean;
    label?: string;
};

export const Also: FC<AlsoProps> = ({ x, label }) => <TagInput value={label} enabled={x} />;
`);

        const result = new ComponentScanner().scan(root);
        const also = result.components.find(component => component.name === 'Also');

        expect(also).toBeDefined();
        expect(also!.props).toEqual([
            { name: 'x', type: 'boolean', optional: false },
            { name: 'label', type: 'string', optional: true },
        ]);
        expect(also!.jsx[0].tag).toBe('TagInput');
    });

    it('does not treat imports, comments or strings as hooks', () => {
        write('ui/src/Noise.tsx', `
import { useThing } from './useThing';
// useCommented appears in a comment
const label = "useQuoted";

export function Noise() {
    return <div>{label}</div>;
}
`);

        const result = new ComponentScanner().scan(root);
        expect(result.components[0].hooks).toEqual([]);
    });

    it('works without a root tsconfig.json', () => {
        write('ui/src/Bare.tsx', `export function Bare() { return <div />; }`);
        expect(() => new ComponentScanner().scan(root)).not.toThrow();
    });
});

describe('TsAstScanner', () => {
    it('scans exported interfaces without a root tsconfig.json', () => {
        write('core/src/types.ts', `
export interface Note {
    id: string;
    tags: string[];
    title?: string;
}
`);

        const data = new TsAstScanner(root).scanProject();

        const note = data.types.get('Note');
        expect(note).toBeDefined();
        expect(note!.properties).toEqual([
            { name: 'id', type: 'string', optional: false, isArray: false, elementType: undefined },
            { name: 'tags', type: 'string[]', optional: false, isArray: true, elementType: 'string' },
            { name: 'title', type: 'string', optional: true, isArray: false, elementType: undefined },
        ]);
    });
});

describe('DEFAULT_PROJECT_ROOT', () => {
    it('resolves a directory containing the pnpm workspace file', () => {
        expect(DEFAULT_PROJECT_ROOT).toBe('/home/me/notention9');
    });
});
