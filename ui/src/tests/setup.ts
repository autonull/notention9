// tests/setup.ts
import '@testing-library/jest-dom';
import {vi} from 'vitest';

// Mock scrollIntoView, which is not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock localStorage for jsdom environment
const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    get length() {
        return 0;
    },
    key: vi.fn(() => null),
};
Object.defineProperty(window, 'localStorage', {value: localStorageMock, writable: true});

// Mock sessionStorage as well
const sessionStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    get length() {
        return 0;
    },
    key: vi.fn(() => null),
};
Object.defineProperty(window, 'sessionStorage', {value: sessionStorageMock, writable: true});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
