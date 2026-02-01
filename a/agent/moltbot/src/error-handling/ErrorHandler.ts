// Comprehensive error handling and transparency system

export interface ErrorInfo {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  stack?: string;
  context?: any;
  resolved: boolean;
  resolution?: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorHandler {
  // Log an error
  logError(error: Error | string, context?: any, level?: string): ErrorInfo;

  // Handle an error with appropriate response
  handleError(error: Error | string, context?: any): ErrorInfo;

  // Get error history
  getErrorHistory(count?: number): ErrorInfo[];

  // Mark an error as resolved
  resolveError(errorId: string, resolution?: string): void;

  // Get unresolved errors
  getUnresolvedErrors(): ErrorInfo[];

  // Subscribe to error events
  subscribe(callback: (error: ErrorInfo) => void): () => void;

  // Initialize error handler
  initialize(): Promise<void>;

  // Clean up resources
  cleanup(): Promise<void>;
}

export interface ErrorReport {
  id: string;
  timestamp: string;
  errors: ErrorInfo[];
  warnings: ErrorInfo[];
  infoMessages: ErrorInfo[];
  summary: {
    total: number;
    unresolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export class TransparentErrorHandler implements ErrorHandler {
  private errorHistory: ErrorInfo[] = [];
  private maxHistorySize: number = 1000;
  private subscribers: Array<(error: ErrorInfo) => void> = [];
  private errorCounts: Map<string, number> = new Map();

  async initialize(): Promise<void> {
    console.log('Transparent error handler initialized');
  }

  async cleanup(): Promise<void> {
    this.errorHistory = [];
    this.subscribers = [];
    this.errorCounts = new Map();
  }

  logError(error: Error | string, context?: any, level: string = 'error'): ErrorInfo {
    const errorInfo = this.createErrorInfo(error, context, level as any);
    this.addErrorToHistory(errorInfo);
    return errorInfo;
  }

  handleError(error: Error | string, context?: any): ErrorInfo {
    const errorInfo = this.logError(error, context);

    // Notify subscribers
    this.notifySubscribers(errorInfo);

    // Take appropriate action based on severity
    this.takeActionBasedOnSeverity(errorInfo);

    return errorInfo;
  }

  getErrorHistory(count: number = 50): ErrorInfo[] {
    return this.errorHistory.slice(-count).reverse();
  }

  resolveError(errorId: string, resolution?: string): void {
    const error = this.errorHistory.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolution = resolution;

      // Log the resolution
      console.log(`Error ${errorId} marked as resolved: ${resolution || 'No resolution provided'}`);
    }
  }

  getUnresolvedErrors(): ErrorInfo[] {
    return this.errorHistory.filter(error => !error.resolved);
  }

  subscribe(callback: (error: ErrorInfo) => void): () => void {
    this.subscribers.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  // Generate a comprehensive error report
  generateErrorReport(): ErrorReport {
    const allErrors = this.getErrorHistory(1000);
    const now = new Date();

    // Filter to last 24 hours
    const recentErrors = allErrors.filter(err => {
      const errorTime = new Date(err.timestamp);
      return (now.getTime() - errorTime.getTime()) < (24 * 60 * 60 * 1000);
    });

    const errors = recentErrors.filter(e => e.level === 'error');
    const warnings = recentErrors.filter(e => e.level === 'warning');
    const infoMessages = recentErrors.filter(e => e.level === 'info');

    const summary = {
      total: recentErrors.length,
      unresolved: recentErrors.filter(e => !e.resolved).length,
      critical: recentErrors.filter(e => e.severity === 'critical').length,
      high: recentErrors.filter(e => e.severity === 'high').length,
      medium: recentErrors.filter(e => e.severity === 'medium').length,
      low: recentErrors.filter(e => e.severity === 'low').length
    };

    return {
      id: `report-${Date.now()}`,
      timestamp: new Date().toISOString(),
      errors,
      warnings,
      infoMessages,
      summary
    };
  }

  // Get error statistics
  getErrorStats(): ErrorStats {
    const now = new Date();
    const last24Hours = this.errorHistory.filter(err => {
      const errorTime = new Date(err.timestamp);
      return (now.getTime() - errorTime.getTime()) < (24 * 60 * 60 * 1000);
    });

    const lastHour = this.errorHistory.filter(err => {
      const errorTime = new Date(err.timestamp);
      return (now.getTime() - errorTime.getTime()) < (60 * 60 * 1000);
    });

    return {
      totalErrors: this.errorHistory.length,
      unresolvedCount: this.getUnresolvedErrors().length,
      last24Hours: last24Hours.length,
      lastHour: lastHour.length,
      errorRatePerHour: last24Hours.length / 24,
      byLevel: {
        critical: this.errorHistory.filter(e => e.level === 'critical').length,
        error: this.errorHistory.filter(e => e.level === 'error').length,
        warning: this.errorHistory.filter(e => e.level === 'warning').length,
        info: this.errorHistory.filter(e => e.level === 'info').length
      },
      bySeverity: {
        critical: this.errorHistory.filter(e => e.severity === 'critical').length,
        high: this.errorHistory.filter(e => e.severity === 'high').length,
        medium: this.errorHistory.filter(e => e.severity === 'medium').length,
        low: this.errorHistory.filter(e => e.severity === 'low').length
      }
    };
  }

  private createErrorInfo(error: Error | string, context?: any, level: 'debug' | 'info' | 'warning' | 'error' | 'critical' = 'error'): ErrorInfo {
    const isError = error instanceof Error;
    const message = isError ? error.message : error;
    const stack = isError ? error.stack : undefined;

    // Determine severity based on level and message content
    const severity = this.determineSeverity(level, message);

    return {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      source: context?.source || 'Unknown',
      stack,
      context,
      resolved: false,
      severity
    };
  }

  private determineSeverity(level: string, message: string): 'low' | 'medium' | 'high' | 'critical' {
    if (level === 'critical') return 'critical';
    if (level === 'error') {
      if (message.toLowerCase().includes('fatal') || message.toLowerCase().includes('critical')) {
        return 'critical';
      }
      if (message.toLowerCase().includes('connection') || message.toLowerCase().includes('timeout')) {
        return 'high';
      }
      return 'medium';
    }
    if (level === 'warning') return 'medium';
    return 'low';
  }

  private addErrorToHistory(errorInfo: ErrorInfo): void {
    this.errorHistory.push(errorInfo);

    // Maintain max history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    // Update error counts
    const errorKey = `${errorInfo.source}:${errorInfo.message.substring(0, 50)}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);
  }

  private notifySubscribers(errorInfo: ErrorInfo): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(errorInfo);
      } catch (subError) {
        console.error('Error in error subscriber:', subError);
        // Don't add this to error history to prevent infinite loop
      }
    }
  }

  private takeActionBasedOnSeverity(errorInfo: ErrorInfo): void {
    switch (errorInfo.severity) {
      case 'critical':
        console.error(`CRITICAL ERROR in ${errorInfo.source}: ${errorInfo.message}`);
        // In a real implementation, this might trigger alerts or emergency procedures
        break;
      case 'high':
        console.error(`HIGH SEVERITY ERROR in ${errorInfo.source}: ${errorInfo.message}`);
        break;
      case 'medium':
        console.warn(`MEDIUM SEVERITY ERROR in ${errorInfo.source}: ${errorInfo.message}`);
        break;
      case 'low':
        console.info(`LOW SEVERITY ERROR in ${errorInfo.source}: ${errorInfo.message}`);
        break;
    }
  }
}

export interface ErrorStats {
  totalErrors: number;
  unresolvedCount: number;
  last24Hours: number;
  lastHour: number;
  errorRatePerHour: number;
  byLevel: {
    critical: number;
    error: number;
    warning: number;
    info: number;
  };
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// Error reporting UI component
export class ErrorReportingUI {
  private errorHandler: TransparentErrorHandler;

  constructor(errorHandler: TransparentErrorHandler) {
    this.errorHandler = errorHandler;
  }

  render(): string {
    const stats = this.errorHandler.getErrorStats();
    const unresolved = this.errorHandler.getUnresolvedErrors().slice(0, 5); // Top 5 unresolved

    let html = `
      <div class="error-reporting-ui">
        <div class="error-summary">
          <h4>Error Summary</h4>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${stats.totalErrors}</div>
              <div class="summary-label">Total Errors</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${stats.unresolvedCount}</div>
              <div class="summary-label">Unresolved</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${stats.last24Hours}</div>
              <div class="summary-label">Last 24H</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${stats.errorRatePerHour.toFixed(2)}</div>
              <div class="summary-label">Per Hour</div>
            </div>
          </div>
        </div>

        <div class="error-breakdown">
          <h4>Error Breakdown</h4>
          <div class="breakdown-grid">
            <div class="breakdown-section">
              <h5>By Level</h5>
              <ul>
                <li>Critical: ${stats.byLevel.critical}</li>
                <li>Error: ${stats.byLevel.error}</li>
                <li>Warning: ${stats.byLevel.warning}</li>
                <li>Info: ${stats.byLevel.info}</li>
              </ul>
            </div>
            <div class="breakdown-section">
              <h5>By Severity</h5>
              <ul>
                <li>Critical: ${stats.bySeverity.critical}</li>
                <li>High: ${stats.bySeverity.high}</li>
                <li>Medium: ${stats.bySeverity.medium}</li>
                <li>Low: ${stats.bySeverity.low}</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="recent-errors">
          <h4>Recent Unresolved Errors</h4>
          <div class="errors-list">
    `;

    if (unresolved.length === 0) {
      html += `<div class="no-errors">No unresolved errors</div>`;
    } else {
      unresolved.forEach(error => {
        html += `
          <div class="error-item">
            <div class="error-header">
              <span class="error-level">${error.level.toUpperCase()}</span>
              <span class="error-severity">${error.severity.toUpperCase()}</span>
              <span class="error-time">${new Date(error.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="error-message">${error.message}</div>
            <div class="error-source">Source: ${error.source}</div>
            <div class="error-actions">
              <button class="btn btn-xs" onclick="resolveError('${error.id}')">Resolve</button>
            </div>
          </div>
        `;
      });
    }

    html += `
          </div>
        </div>

        <div class="error-actions">
          <button class="btn btn-sm" onclick="refreshErrorReport()">Refresh</button>
          <button class="btn btn-sm" onclick="generateFullReport()">Generate Full Report</button>
        </div>
      </div>
    `;

    return html;
  }

  getCSS(): string {
    return `
      .error-reporting-ui {
        padding: 1rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .error-summary {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 0.5rem;
        border: 1px solid #e2e8f0;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }

      .summary-item {
        text-align: center;
      }

      .summary-value {
        font-size: 1.5rem;
        font-weight: bold;
        color: #1e293b;
      }

      .summary-label {
        font-size: 0.75rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .error-breakdown {
        margin-bottom: 1.5rem;
      }

      .breakdown-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .breakdown-section h5 {
        margin: 0 0 0.5rem 0;
        color: #334155;
        font-size: 0.875rem;
      }

      .breakdown-section ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .breakdown-section li {
        padding: 0.25rem 0;
        font-size: 0.875rem;
        color: #475569;
      }

      .recent-errors {
        margin-bottom: 1rem;
      }

      .errors-list {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
      }

      .no-errors {
        padding: 1rem;
        text-align: center;
        color: #64748b;
      }

      .error-item {
        padding: 0.75rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .error-item:last-child {
        border-bottom: none;
      }

      .error-header {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 0.25rem;
        font-size: 0.75rem;
      }

      .error-level {
        background: #f87171;
        color: white;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-weight: bold;
      }

      .error-severity {
        background: #fbbf24;
        color: white;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-weight: bold;
      }

      .error-time {
        color: #64748b;
      }

      .error-message {
        font-weight: 500;
        color: #1e293b;
        margin-bottom: 0.25rem;
      }

      .error-source {
        font-size: 0.75rem;
        color: #64748b;
        margin-bottom: 0.5rem;
      }

      .error-actions {
        display: flex;
        justify-content: flex-end;
      }

      .btn {
        padding: 0.25rem 0.5rem;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s ease;
      }

      .btn:hover {
        background: #f3f4f6;
      }

      .btn-xs {
        padding: 0.125rem 0.25rem;
        font-size: 0.75rem;
      }

      .btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
      }
    `;
  }

  getJS(): string {
    return `
      function resolveError(errorId) {
        if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
          window.uiWebSocket.send(JSON.stringify({
            type: 'resolve_error',
            payload: { errorId }
          }));
        }
      }

      function refreshErrorReport() {
        if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
          window.uiWebSocket.send(JSON.stringify({
            type: 'refresh_error_report'
          }));
        }
      }

      function generateFullReport() {
        if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
          window.uiWebSocket.send(JSON.stringify({
            type: 'generate_error_report'
          }));
        }
      }
    `;
  }
}