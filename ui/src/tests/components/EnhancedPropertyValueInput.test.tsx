import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import type {OntologyAttribute} from '@notention/core';
import {EnhancedPropertyValueInput} from '../../components/properties/EnhancedPropertyValueInput';

const status: OntologyAttribute = {
    type: 'enum',
    options: ['operational', 'degraded', 'down', 'maintenance'],
    operators: {real: ['is'], imaginary: []},
};

describe('EnhancedPropertyValueInput', () => {
    it('shows an imported custom value as the current option', () => {
        render(<EnhancedPropertyValueInput value="open" onChange={() => {}} attributeDef={status}/>);

        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('open');
        expect(screen.getByRole('option', {name: 'open'})).toBeTruthy();
    });

    it('reports the next enum choice', () => {
        const onChange = vi.fn();
        render(<EnhancedPropertyValueInput value="open" onChange={onChange} attributeDef={status}/>);

        fireEvent.change(screen.getByRole('combobox'), {target: {value: 'degraded'}});

        expect(onChange).toHaveBeenCalledWith('degraded');
    });
});
