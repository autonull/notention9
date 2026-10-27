import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };
  private resetKeys = 0;

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private resetError = () => {
    this.setState({ hasError: false, error: null });
    this.resetKeys++;
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      return (
        <ErrorFallback error={this.state.error!} resetError={this.resetError} />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <Card variant="elevated" className="max-w-md w-full">
        <div className="flex flex-col items-center text-center p-8">
          <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mb-4">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 mb-6">{error.message || 'An unexpected error occurred'}</p>
          <Button
            variant="primary"
            onClick={resetError}
            icon={<RefreshCw size={18} />}
            iconPosition="left"
          >
            Try Again
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ErrorBoundary;