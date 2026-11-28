/**
 * Minimal Signal Implementation
 * 
 * Fine-grained reactivity primitives inspired by SolidJS/Preact signals.
 * No external dependencies, ~200 lines.
 * 
 * @example
 * ```typescript
 * const count = createSignal(0);
 * const doubled = createComputed(() => count.get() * 2);
 * 
 * createEffect(() => console.log('Count changed:', count.get()));
 * 
 * count.set(5); // Logs: "Count changed: 5"
 * ```
 */

type SignalGetter<T> = () => T;
type SignalSetter<T> = (value: T | ((prev: T) => T)) => T;
type Signal<T> = [SignalGetter<T>, SignalSetter<T>];

type ComputedGetter<T> = () => T;
type Computed<T> = ComputedGetter<T>;

type EffectCallback = () => void | (() => void);
type Effect = (callback: EffectCallback) => () => void;

type EqualityFn<T> = (a: T, b: T) => boolean;

/** Default equality check */
function defaultEquals<T>(a: T, b: T): boolean {
    return Object.is(a, b);
}

/** Global signal graph */
interface SignalNode {
    version: number;
    subscribers: Set<SignalNode>;
    dependencies: Set<SignalNode>;
}

interface SignalState<T> extends SignalNode {
    value: T;
    equals: EqualityFn<T>;
}

interface ComputedState<T> extends SignalNode {
    fn: () => T;
    value: T;
    dirty: boolean;
    equals: EqualityFn<T>;
}

interface EffectState extends SignalNode {
    fn: EffectCallback;
    cleanup: void | (() => void);
    scheduled: boolean;
}

const rootNode: SignalNode = {
    version: 0,
    subscribers: new Set(),
    dependencies: new Set(),
};

let currentOwner: SignalNode | null = null;
let currentComputed: ComputedState<any> | null = null;
let currentEffect: EffectState | null = null;
let batchDepth = 0;
const pendingEffects: Set<EffectState> = new Set();

/** Create a signal with initial value */
export function createSignal<T>(value: T, options?: { equals?: EqualityFn<T> }): Signal<T> {
    const state: SignalState<T> = {
        value,
        equals: options?.equals ?? defaultEquals,
        version: 0,
        subscribers: new Set(),
        dependencies: new Set(),
    };

    const getter = (): T => {
        if (currentOwner) {
            // Track dependency
            if (!currentOwner.dependencies.has(state)) {
                currentOwner.dependencies.add(state);
                state.subscribers.add(currentOwner);
            }
        }
        return state.value;
    };

    const setter = (newValue: T | ((prev: T) => T)): T => {
        const resolvedValue = typeof newValue === 'function' 
            ? (newValue as (prev: T) => T)(state.value) 
            : newValue;

        if (!state.equals(state.value, resolvedValue)) {
            state.value = resolvedValue;
            state.version++;
            notifySubscribers(state);
        }
        return state.value;
    };

    return [getter, setter];
}

/** Create a computed signal */
export function createComputed<T>(fn: () => T, options?: { equals?: EqualityFn<T> }): Computed<T> {
    const state: ComputedState<T> = {
        fn,
        value: undefined as any,
        dirty: true,
        equals: options?.equals ?? defaultEquals,
        version: 0,
        subscribers: new Set(),
        dependencies: new Set(),
    };

    const getter = (): T => {
        if (state.dirty) {
            recompute(state);
        }
        
        if (currentOwner) {
            if (!currentOwner.dependencies.has(state)) {
                currentOwner.dependencies.add(state);
                state.subscribers.add(currentOwner);
            }
        }
        
        return state.value;
    };

    return getter;
}

/** Create an effect */
export function createEffect(fn: EffectCallback): () => void {
    const state: EffectState = {
        fn,
        cleanup: undefined,
        scheduled: false,
        version: 0,
        subscribers: new Set(),
        dependencies: new Set(),
    };

    const run = () => {
        state.scheduled = false;
        const prevOwner = currentOwner;
        const prevEffect = currentEffect;
        currentOwner = state;
        currentEffect = state;
        
        try {
            // Run cleanup from previous execution
            if (typeof state.cleanup === 'function') {
                state.cleanup();
            }
            state.cleanup = fn() ?? undefined;
        } finally {
            currentOwner = prevOwner;
            currentEffect = prevEffect;
        }
    };

    // Initial run
    if (batchDepth === 0) {
        run();
    } else {
        state.scheduled = true;
        pendingEffects.add(state);
    }

    // Return dispose function
    return () => {
        if (typeof state.cleanup === 'function') {
            state.cleanup();
        }
        state.fn = () => {};
        state.cleanup = undefined;
        // Remove from subscribers
        for (const dep of state.dependencies) {
            dep.subscribers.delete(state);
        }
        state.dependencies.clear();
        state.subscribers.clear();
    };
}

/** Create a memo (alias for computed) */
export function createMemo<T>(fn: () => T, options?: { equals?: EqualityFn<T> }): Computed<T> {
    return createComputed(fn, options);
}

/** Create a resource (async signal) */
export function createResource<T>(fetcher: () => Promise<T>, initialValue: T): [Computed<T>, { latest: Computed<T>; loading: Computed<boolean>; error: Computed<Error | null> }] {
    const data = createSignal<T>(initialValue);
    const loading = createSignal<boolean>(false);
    const error = createSignal<Error | null>(null);

    const load = async () => {
        loading[1](true);
        error[1](null);
        try {
            const result = await fetcher();
            data[1](result);
        } catch (e) {
            error[1](e as Error);
        } finally {
            loading[1](false);
        }
    };

    createEffect(() => {
        load();
    });

    return [
        data[0],
        {
            latest: data[0],
            loading: loading[0],
            error: error[0],
        }
    ];
}

/** Batch multiple signal updates */
export function batch(fn: () => void): void {
    batchDepth++;
    try {
        fn();
    } finally {
        batchDepth--;
        if (batchDepth === 0) {
            flushEffects();
        }
    }
}

/** Notify all subscribers of a state change */
function notifySubscribers(node: SignalNode): void {
    for (const subscriber of node.subscribers) {
        if ('dirty' in subscriber) {
            // Computed - mark dirty
            (subscriber as ComputedState<any>).dirty = true;
        } else if ('scheduled' in subscriber) {
            // Effect - schedule
            if (!subscriber.scheduled && batchDepth === 0) {
                subscriber.scheduled = true;
                pendingEffects.add(subscriber as EffectState);
            }
        }
    }
    
    if (batchDepth === 0) {
        flushEffects();
    }
}

/** Recompute a computed value */
function recompute<T>(state: ComputedState<T>): void {
    const prevOwner = currentOwner;
    const prevComputed = currentComputed;
    currentOwner = state;
    currentComputed = state;
    
    try {
        const newValue = state.fn();
        if (state.dirty || !state.equals(state.value, newValue)) {
            state.value = newValue;
            state.version++;
            state.dirty = false;
            notifySubscribers(state);
        }
    } finally {
        currentOwner = prevOwner;
        currentComputed = prevComputed;
    }
}

/** Flush all pending effects */
function flushEffects(): void {
    const effects = Array.from(pendingEffects);
    pendingEffects.clear();
    
    for (const effect of effects) {
        if (effect.scheduled) {
            const prevOwner = currentOwner;
            const prevEffect = currentEffect;
            currentOwner = effect;
            currentEffect = effect;
            
            try {
                if (typeof effect.cleanup === 'function') {
                    effect.cleanup();
                }
                effect.cleanup = effect.fn() ?? undefined;
                effect.scheduled = false;
            } finally {
                currentOwner = prevOwner;
                currentEffect = prevEffect;
            }
        }
    }
}

/** Untrack a signal (read without creating dependency) */
export function untrack<T>(fn: () => T): T {
    const prevOwner = currentOwner;
    currentOwner = null;
    try {
        return fn();
    } finally {
        currentOwner = prevOwner;
    }
}

/** Create a root for effect disposal */
export function createRoot(fn: (dispose: () => void) => void): void {
    const disposeEffects: (() => void)[] = [];
    const prevOwner = currentOwner;
    const rootOwner: SignalNode = {
        version: 0,
        subscribers: new Set(),
        dependencies: new Set(),
    };
    currentOwner = rootOwner;
    
    try {
        fn(() => {
            for (const dispose of disposeEffects) {
                dispose();
            }
        });
    } finally {
        currentOwner = prevOwner;
    }
}

/** Store - combines multiple signals with selectors */
export interface Store<T extends object> {
    /** Get the full state (creates dependency on all) */
    get(): T;
    /** Get a single property */
    getKey<K extends keyof T>(key: K): T[K];
    /** Set a single property */
    set<K extends keyof T>(key: K, value: T[K] | ((prev: T[K]) => T[K])): T[K];
    /** Update multiple properties */
    update(partial: Partial<T> | ((state: T) => Partial<T>)): T;
    /** Subscribe to changes */
    subscribe(listener: (state: T) => void): () => void;
    /** Select a derived value */
    select<U>(selector: (state: T) => U): Computed<U>;
    /** Reset to initial state */
    reset(): void;
}

/** Create a reactive store from an object */
export function createStore<T extends object>(initial: T): Store<T> {
    const signals = new Map<keyof T, SignalState<any>>();
    const subscribers = new Set<(state: T) => void>();
    let state = { ...initial };
    let version = 0;

    // Create signals for each property
    for (const key of Object.keys(initial) as (keyof T)[]) {
        signals.set(key, {
            value: initial[key],
            equals: defaultEquals,
            version: 0,
            subscribers: new Set(),
            dependencies: new Set(),
        });
    }

    const notify = () => {
        state = { ...state };
        version++;
        for (const sub of subscribers) {
            sub(state);
        }
    };

    return {
        get: (): T => {
            if (currentOwner) {
                // Track all signals
                for (const signal of signals.values()) {
                    if (!currentOwner.dependencies.has(signal)) {
                        currentOwner.dependencies.add(signal);
                        signal.subscribers.add(currentOwner);
                    }
                }
            }
            return state;
        },
        
        getKey<K extends keyof T>(key: K): T[K] {
            const signal = signals.get(key);
            if (!signal) throw new Error(`Property ${String(key)} not found in store`);
            if (currentOwner) {
                if (!currentOwner.dependencies.has(signal)) {
                    currentOwner.dependencies.add(signal);
                    signal.subscribers.add(currentOwner);
                }
            }
            return signal.value;
        },

        set<K extends keyof T>(key: K, value: T[K] | ((prev: T[K]) => T[K])): T[K] {
            const signal = signals.get(key);
            if (!signal) throw new Error(`Property ${String(key)} not found in store`);
            
            const resolvedValue = typeof value === 'function' 
                ? (value as (prev: T[K]) => T[K])(signal.value) 
                : value;
            
            if (!signal.equals(signal.value, resolvedValue)) {
                signal.value = resolvedValue;
                signal.version++;
                state = { ...state, [key]: resolvedValue };
                notify();
            }
            return state[key];
        },

        update(partial: Partial<T> | ((state: T) => Partial<T>)): T {
            const updates = typeof partial === 'function' ? partial(state) : partial;
            let changed = false;
            
            for (const [key, value] of Object.entries(updates) as [string, unknown][]) {
                const signal = signals.get(key as keyof T);
                if (signal && !signal.equals(signal.value, value)) {
                    signal.value = value as T[keyof T];
                    signal.version++;
                    state[key as keyof T] = value as T[keyof T];
                    changed = true;
                }
            }
            
            if (changed) {
                notify();
            }
            return state;
        },

        subscribe(listener: (state: T) => void): () => void {
            subscribers.add(listener);
            return () => subscribers.delete(listener);
        },

        select<U>(selector: (state: T) => U): Computed<U> {
            return createComputed(() => selector(this.get()));
        },

        reset(): void {
            for (const [key, signal] of signals) {
                signal.value = initial[key];
                signal.version++;
            }
            state = { ...initial };
            notify();
        },
    };
}

/** Persist store to localStorage/localForage */
export function persistStore<T extends object>(
    store: Store<T>,
    key: string,
    storage?: Storage
): () => void {
    const storageImpl = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!storageImpl) return () => {};

    // Load initial state
    try {
        const stored = storageImpl.getItem(key);
        if (stored) {
            store.update(JSON.parse(stored));
        }
    } catch {}

    // Subscribe to changes
    return store.subscribe((state) => {
        try {
            storageImpl.setItem(key, JSON.stringify(state));
        } catch {}
    });
}

/** DevTools integration */
export interface DevToolsState<T> {
    state: T;
    history: Array<{ state: T; timestamp: number; action?: string }>;
    index: number;
    maxHistory: number;
}

export function createDevTools<T extends object>(store: Store<T>, maxHistory = 100): DevToolsState<T> & {
    undo: () => void;
    redo: () => void;
    jump: (index: number) => void;
    getStateAt: (index: number) => T | undefined;
} {
    const devTools: DevToolsState<T> = {
        state: store.get(),
        history: [{ state: store.get(), timestamp: Date.now() }],
        index: 0,
        maxHistory,
    };

    const unsubscribe = store.subscribe((state) => {
        if (devTools.index < devTools.history.length - 1) {
            devTools.history.splice(devTools.index + 1);
        }
        devTools.history.push({ state, timestamp: Date.now() });
        if (devTools.history.length > maxHistory) {
            devTools.history.shift();
        } else {
            devTools.index++;
        }
        devTools.state = state;
    });

    return {
        ...devTools,
        undo: () => {
            if (devTools.index > 0) {
                devTools.index--;
                store.update(devTools.history[devTools.index].state);
            }
        },
        redo: () => {
            if (devTools.index < devTools.history.length - 1) {
                devTools.index++;
                store.update(devTools.history[devTools.index].state);
            }
        },
        jump: (index: number) => {
            if (index >= 0 && index < devTools.history.length) {
                devTools.index = index;
                store.update(devTools.history[index].state);
            }
        },
        getStateAt: (index: number) => devTools.history[index]?.state,
    };
}

// Re-export types
export type { Signal, Computed, Effect, SignalGetter, SignalSetter, EqualityFn };