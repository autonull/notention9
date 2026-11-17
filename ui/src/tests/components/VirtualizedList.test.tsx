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

    it('handles 10k items with virtualization (only renders visible items)', () => {
        const largeItems = Array.from({length: 10000}, (_, i) => ({id: `item-${i}`, label: `Item ${i}`}));
        const onItemClick = vi.fn();
        
        render(
            <VirtualizedList
                items={largeItems}
                itemHeight={40}
                containerHeight={400}
                getItemKey={item => item.id}
                onItemClick={onItemClick}
                role="listbox"
                aria-label="Large list"
            >
                {item => <div className="note-list-item" data-testid={item.id}>{item.label}</div>}
            </VirtualizedList>
        );

        // Should only render visible items (containerHeight / itemHeight + overscan)
        // 400/40 = 10 visible + ~5 overscan = ~15 items
        const renderedItems = screen.getAllByTestId((id: string) => id.startsWith('item-'));
        expect(renderedItems.length).toBeLessThan(30); // Should be ~15-20, not 10000
        
        // First visible item should be item-0
        expect(screen.getByTestId('item-0')).toBeTruthy();
        
        // Item at index 100 should NOT be rendered initially
        expect(screen.queryByTestId('item-100')).toBeFalsy();
    });

    it('scrolls to index and renders correct items', () => {
        const largeItems = Array.from({length: 10000}, (_, i) => ({id: `item-${i}`, label: `Item ${i}`}));
        const onItemClick = vi.fn();
        const {container} = render(
            <VirtualizedList
                items={largeItems}
                itemHeight={40}
                containerHeight={400}
                getItemKey={item => item.id}
                onItemClick={onItemClick}
                role="listbox"
                aria-label="Large list"
                overscan={5}
            >
                {item => <div className="note-list-item" data-testid={item.id}>{item.label}</div>}
            </VirtualizedList>
        );

        const list = container.firstChild as HTMLElement;
        // Scroll to item 500
        list.scrollTop = 500 * 40;
        fireEvent.scroll(list);

        // Items around 500 should now be rendered (with overscan=5, renders 489-494)
        expect(screen.getByTestId('item-490')).toBeTruthy();
        expect(screen.getByTestId('item-494')).toBeTruthy();
        // Item 0 should no longer be rendered (scrolled away)
        expect(screen.queryByTestId('item-0')).toBeFalsy();
    });
});
