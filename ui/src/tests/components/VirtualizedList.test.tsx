import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {VirtualizedList} from '../../components/ui/VirtualizedList';

const items = [{id: 'a', label: 'Alpha'}, {id: 'b', label: 'Beta'}];

const renderList = (props: Partial<React.ComponentProps<typeof VirtualizedList>> = {}) =>
    render(
        <VirtualizedList
            items={items}
            itemHeight={40}
            containerHeight={200}
            getItemKey={item => item.id}
            onItemClick={vi.fn()}
            role="listbox"
            aria-label="Test list"
            {...props}
        >
            {item => <div className="note-list-item">{item.label}</div>}
        </VirtualizedList>
    );

describe('VirtualizedList', () => {
    beforeEach(() => {
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            callback(0);
            return 0;
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('moves focus and selects items with the keyboard', async () => {
        const onItemClick = vi.fn();
        renderList({onItemClick});

        const list = screen.getByRole('listbox');
        list.focus();
        fireEvent.keyDown(list, {key: 'ArrowDown'});

        await waitFor(() => expect(document.activeElement?.getAttribute('data-index')).toBe('0'));

        fireEvent.keyDown(document.activeElement!, {key: 'Enter'});
        expect(onItemClick).toHaveBeenCalledWith(items[0], 0);
    });

    it('can transition from empty to populated without breaking hooks', () => {
        const {rerender} = renderList({items: []});

        expect(screen.getByText('No items found')).toBeTruthy();

        rerender(
            <VirtualizedList
                items={items}
                itemHeight={40}
                containerHeight={200}
                getItemKey={item => item.id}
                aria-label="Test list"
            >
                {item => <div className="note-list-item">{item.label}</div>}
            </VirtualizedList>
        );

        expect(screen.getByText('Alpha')).toBeTruthy();
    });
});
