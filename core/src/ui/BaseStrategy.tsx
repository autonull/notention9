import React, { Component, ErrorInfo, ReactElement, ReactNode } from 'react';
import { createComponentStrategy, type Seam, type Strategy } from './strategy.js';

export interface BaseStrategyProps {
    /** Ontology nodes for the strategy */
    ontology?: any[];
    /** Called when the strategy completes successfully */
    onSave?: (...args: any[]) => void;
    /** Called when the strategy is cancelled or closed */
    onCancel?: () => void;
    /** Called when the strategy is closed (alias for onCancel) */
    onClose?: () => void;
    /** Whether the strategy is in a loading state */
    isLoading?: boolean;
    /** Error message to display */
    error?: string | Error | null;
    /** Children content */
    children?: ReactNode;
    /** ARIA label for the strategy container */
    ariaLabel?: string;
    /** ARIA describedby ID for error messages */
    ariaDescribedBy?: string;
    /** Additional class names */
    className?: string;
    /** Test ID for testing */
    testId?: string;
}

interface BaseStrategyState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Base component for all strategies providing common functionality:
 * - Error boundary
 * - Loading state handling
 * - Accessibility attributes
 * - Consistent error/loading UI
 */
export abstract class BaseStrategy<P extends BaseStrategyProps> extends Component<P, BaseStrategyState> {
    constructor(props: P) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): BaseStrategyState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error(`[BaseStrategy] Error in ${this.constructor.name}:`, error, errorInfo);
    }

    /**
     * Render the strategy-specific content
     * Must be implemented by subclasses
     */
    protected abstract renderStrategy(props: P): ReactElement;

    /**
     * Render fallback UI when an error occurs
     */
    protected renderFallback(): ReactElement {
        const { error } = this.state;
        return (
            <div
                role="alert"
                aria-live="assertive"
                className="strategy-error-fallback"
                data-testid={`${this.props.testId}-error`}
            >
                <p>Something went wrong with this strategy.</p>
                {error && process.env.NODE_ENV !== 'production' && (
                    <pre>{error.message}</pre>
                )}
                <button
                    type="button"
                    onClick={() => this.props.onCancel?.()}
                    className="strategy-error-dismiss"
                >
                    Dismiss
                </button>
            </div>
        );
    }

    /**
     * Render loading indicator
     */
    protected renderLoading(): ReactElement {
        return (
            <div
                role="status"
                aria-live="polite"
                aria-label="Loading"
                className="strategy-loading"
                data-testid={`${this.props.testId}-loading`}
            >
                <span className="spinner" aria-hidden="true" />
                <span className="sr-only">Loading...</span>
            </div>
        );
    }

    /**
     * Get common accessibility props
     */
    protected getA11yProps(): Record<string, any> {
        const { ariaLabel, ariaDescribedBy, testId } = this.props;
        return {
            role: 'region',
            'aria-label': ariaLabel || this.constructor.name.replace('Strategy', ''),
            'aria-describedby': ariaDescribedBy,
            'data-testid': testId || this.constructor.name.toLowerCase().replace('strategy', ''),
        };
    }

    render(): ReactElement {
        const { hasError, error } = this.state;
        const { isLoading, children, className, onCancel } = this.props;

        if (hasError) {
            return this.renderFallback();
        }

        const content = (
            <>
                {isLoading && this.renderLoading()}
                {!isLoading && this.renderStrategy(this.props)}
            </>
        );

        return (
            <div
                {...this.getA11yProps()}
                className={`strategy-container ${className || ''}`}
            >
                {content}
            </div>
        );
    }
}

/**
 * Hook for functional strategy components to access base strategy utilities
 */
export function useBaseStrategy<P extends BaseStrategyProps>(
    props: P,
    renderStrategy: (props: P) => ReactElement
): ReactElement {
    const [hasError, setHasError] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    const handleError = React.useCallback((err: Error) => {
        console.error('[useBaseStrategy] Error:', err);
        setError(err);
        setHasError(true);
    }, []);

    const getA11yProps = React.useCallback(() => ({
        role: 'region' as const,
        'aria-label': props.ariaLabel || 'Strategy',
        'aria-describedby': props.ariaDescribedBy,
        'data-testid': props.testId || 'strategy',
    }), [props.ariaLabel, props.ariaDescribedBy, props.testId]);

    const renderLoading = React.useCallback(() => (
        <div
            role="status"
            aria-live="polite"
            aria-label="Loading"
            className="strategy-loading"
            data-testid={`${props.testId}-loading`}
        >
            <span className="spinner" aria-hidden="true" />
            <span className="sr-only">Loading...</span>
        </div>
    ), [props.testId]);

    const renderFallback = React.useCallback(() => (
        <div
            role="alert"
            aria-live="assertive"
            className="strategy-error-fallback"
            data-testid={`${props.testId}-error`}
        >
            <p>Something went wrong with this strategy.</p>
            {error && process.env.NODE_ENV !== 'production' && (
                <pre>{error.message}</pre>
            )}
            <button
                type="button"
                onClick={() => props.onCancel?.()}
                className="strategy-error-dismiss"
            >
                Dismiss
            </button>
        </div>
    ), [error, props.onCancel, props.testId]);

    if (hasError) {
        return renderFallback();
    }

    return (
        <div {...getA11yProps()} className={`strategy-container ${props.className || ''}`}>
            {props.isLoading && renderLoading()}
            {!props.isLoading && renderStrategy(props)}
        </div>
    );
}

/**
 * Higher-order component to add base strategy functionality to a component
 */
export function withBaseStrategy<P extends BaseStrategyProps>(
    WrappedComponent: React.ComponentType<P>,
    defaultProps?: Partial<P>
): React.FC<P> {
    const WithBaseStrategy: React.FC<P> = (props) => {
        return useBaseStrategy(
            { ...defaultProps, ...props },
            (p) => React.createElement(WrappedComponent, p)
        );
    };
    WithBaseStrategy.displayName = `withBaseStrategy(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
    return WithBaseStrategy;
}

/**
 * Create a strategy with base strategy functionality (error boundary, loading, a11y)
 * Similar to createComponentStrategy but wraps component with BaseStrategy HOC
 */
export function createBaseStrategy<P extends BaseStrategyProps>(
    id: string,
    seam: Seam,
    component: React.ComponentType<P>,
    version: string = '1.0.0',
    defaultProps: Partial<P> = {}
): Strategy<P> {
    const WrappedComponent = withBaseStrategy(component, defaultProps);
    return createComponentStrategy(id, seam, WrappedComponent, version, defaultProps);
}