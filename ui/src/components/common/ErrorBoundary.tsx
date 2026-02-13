import React, {Component, ErrorInfo, ReactNode} from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-200 p-4">
                    <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-semibold text-red-400 mb-2">Something went wrong</h2>
                        <p className="text-gray-400 mb-4">
                            The application encountered an unexpected error.
                        </p>
                        <div className="bg-gray-900 p-3 rounded mb-4 overflow-x-auto">
                            <code className="text-sm text-red-300 font-mono">
                                {this.state.error?.message}
                            </code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
