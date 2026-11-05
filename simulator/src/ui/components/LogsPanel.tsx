import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Search, X, Copy, Trash2, Filter, PauseCircle, PlayCircle, Terminal, Download, Zap, AlertTriangle, Users, Bot } from 'lucide-react';
import { Button, IconButton, Input, Select, Kbd } from '../components/ui';
import { Card, CardHeader, CardContent } from '../components/ui';
import { Badge } from '../components/ui';
import { DesignTokens } from '../components/ui';
import { cn } from '../utils';
import type { JobStatus, LogLevel, RunEvent, RunEventFilterType, RunEventType } from '../hooks/useLivePreview';

interface LogsPanelContextType {
  logFilter: LogLevel;
  setLogFilter: React.Dispatch<React.SetStateAction<LogLevel>>;
  logSearch: string;
  setLogSearch: React.Dispatch<React.SetStateAction<string>>;
  paused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  showLogPanel: boolean;
  setShowLogPanel: React.Dispatch<React.SetStateAction<boolean>>;
  logPanelWidth: number;
  setLogPanelWidth: React.Dispatch<React.SetStateAction<number>>;
  isResizingLogs: boolean;
  setIsResizingLogs: React.Dispatch<React.SetStateAction<boolean>>;
  filteredLogs: string[];
  filteredRunEvents: RunEvent[];
  job: JobStatus | null;
  logsEndRef: React.RefObject<HTMLDivElement>;
  runEventsEndRef: React.RefObject<HTMLDivElement>;
  copyLogs: () => void;
  downloadLogs: () => void;
  clearLogs: () => void;
  handleResizeStart: (e: React.MouseEvent) => void;
  handleResizeMove: (e: MouseEvent) => void;
  handleResizeEnd: () => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  eventTypeFilter: RunEventFilterType;
  setEventTypeFilter: React.Dispatch<React.SetStateAction<RunEventFilterType>>;
  agentFilter: string;
  setAgentFilter: React.Dispatch<React.SetStateAction<string>>;
  showRunEvents: boolean;
  setShowRunEvents: React.Dispatch<React.SetStateAction<boolean>>;
}

const LogsPanelContext = createContext<LogsPanelContextType | undefined>(undefined);

export const useLogsPanel = () => {
  const context = useContext(LogsPanelContext);
  if (!context) {
    throw new Error('useLogsPanel must be used within a LogsPanelProvider');
  }
  return context;
};

interface LogsPanelProviderProps {
  children: React.ReactNode;
  job: JobStatus | null;
  initialWidth?: number;
}

const RUN_EVENT_TYPE_LABELS: Record<RunEventType, string> = {
  'scenario:start': 'Scenario Start',
  'scenario:end': 'Scenario End',
  'agent:spawn': 'Agent Spawn',
  'agent:action': 'Agent Action',
  'event:scheduled': 'Event Scheduled',
  'event:executed': 'Event Executed',
  'match:found': 'Match Found',
  'error': 'Error',
};

const RUN_EVENT_TYPE_COLORS: Record<RunEventType, { bg: string; text: string; icon: React.ReactNode }> = {
  'scenario:start': { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: <Bot size={10} /> },
  'scenario:end': { bg: 'bg-green-900/30', text: 'text-green-400', icon: <Bot size={10} /> },
  'agent:spawn': { bg: 'bg-purple-900/30', text: 'text-purple-400', icon: <Users size={10} /> },
  'agent:action': { bg: 'bg-cyan-900/30', text: 'text-cyan-400', icon: <Zap size={10} /> },
  'event:scheduled': { bg: 'bg-yellow-900/30', text: 'text-yellow-400', icon: <Zap size={10} /> },
  'event:executed': { bg: 'bg-emerald-900/30', text: 'text-emerald-400', icon: <Zap size={10} /> },
  'match:found': { bg: 'bg-indigo-900/30', text: 'text-indigo-400', icon: <Zap size={10} /> },
  'error': { bg: 'bg-red-900/30', text: 'text-red-400', icon: <AlertTriangle size={10} /> },
};

export const LogsPanelProvider: React.FC<LogsPanelProviderProps> = ({ children, job, initialWidth = 320 }) => {
  const [logFilter, setLogFilter] = useState<LogLevel>('all');
  const [logSearch, setLogSearch] = useState('');
  const [paused, setPaused] = useState(false);
  const [showLogPanel, setShowLogPanel] = useState(true);
  const [logPanelWidth, setLogPanelWidth] = useState(initialWidth);
  const [isResizingLogs, setIsResizingLogs] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState<RunEventFilterType>('all');
  const [agentFilter, setAgentFilter] = useState('');
  const [showRunEvents, setShowRunEvents] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const runEventsEndRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef({ x: 0, width: initialWidth });

  const detectLogLevel = useCallback((log: string): LogLevel => {
    const lower = log.toLowerCase();
    if (lower.includes('error') || lower.includes('fail')) return 'error';
    if (lower.includes('warn')) return 'warn';
    if (lower.includes('debug')) return 'debug';
    return 'info';
  }, []);

  const filteredLogs = useMemo(() =>
    job?.logs
      .filter((log) => {
        if (logFilter !== 'all') {
          const detected = detectLogLevel(log);
          return detected === logFilter;
        }
        return true;
      })
      .filter((log) => !logSearch || log.toLowerCase().includes(logSearch.toLowerCase())),
    [job?.logs, logFilter, logSearch, detectLogLevel]
  );

  const filteredRunEvents = useMemo(() => {
    if (!job?.runEvents) return [];
    return job.runEvents.filter((event) => {
      if (eventTypeFilter !== 'all' && event.type !== eventTypeFilter) return false;
      if (agentFilter && event.data.agentName && !event.data.agentName.toLowerCase().includes(agentFilter.toLowerCase())) return false;
      if (logSearch && JSON.stringify(event.data).toLowerCase().includes(logSearch.toLowerCase())) return true;
      if (!logSearch) return true;
      return false;
    });
  }, [job?.runEvents, eventTypeFilter, agentFilter, logSearch]);

  useEffect(() => {
    if (logsEndRef.current && !paused) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (runEventsEndRef.current && !paused) {
      runEventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [job?.logs, job?.runEvents, paused]);

  const copyLogs = useCallback(() => {
    const logs = filteredLogs.map((log, i) => `[${i}] ${log}`).join('\n') || 'No logs';
    navigator.clipboard.writeText(logs);
  }, [filteredLogs]);

  const downloadLogs = useCallback(() => {
    const allLogs = job?.logs.map((log, i) => `[${i}] ${log}`).join('\n') || 'No logs';
    const blob = new Blob([allLogs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job?.scenario || 'simulation'}-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [job]);

  const downloadRunEvents = useCallback(() => {
    const events = filteredRunEvents.map((e, i) => `[${i}] ${e.type}: ${JSON.stringify(e.data)}`).join('\n') || 'No events';
    const blob = new Blob([events], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job?.scenario || 'simulation'}-events-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [job, filteredRunEvents]);

  const clearLogs = useCallback(() => {
    console.log('Log clearing requires backend support');
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLogs(true);
    resizeStartRef.current = { x: e.clientX, width: logPanelWidth };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [logPanelWidth]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingLogs) return;
    const newWidth = Math.min(Math.max(resizeStartRef.current.width + (resizeStartRef.current.x - e.clientX), 200), 600);
    setLogPanelWidth(newWidth);
  }, [isResizingLogs]);

  const handleResizeEnd = useCallback(() => {
    setIsResizingLogs(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove, handleResizeEnd]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;

    switch (e.key) {
      case 'Escape':
        setShowLogPanel(!showLogPanel);
        break;
      case ' ':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setPaused(!paused);
        }
        break;
      case 'l':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setLogSearch('');
          const input = document.getElementById('log-search');
          input?.focus();
        }
        break;
    }
  }, [showLogPanel, paused]);

  const value = {
    logFilter,
    setLogFilter,
    logSearch,
    setLogSearch,
    paused,
    setPaused,
    showLogPanel,
    setShowLogPanel,
    logPanelWidth,
    setLogPanelWidth,
    isResizingLogs,
    setIsResizingLogs,
    filteredLogs,
    filteredRunEvents,
    job,
    logsEndRef,
    runEventsEndRef,
    copyLogs,
    downloadLogs,
    downloadRunEvents,
    clearLogs,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleKeyDown,
    eventTypeFilter,
    setEventTypeFilter,
    agentFilter,
    setAgentFilter,
    showRunEvents,
    setShowRunEvents,
  };

  return <LogsPanelContext.Provider value={value}>{children}</LogsPanelContext.Provider>;
};

const LogEntry = ({ log, index, searchQuery, onClick, level }: {
  log: string;
  index: number;
  searchQuery: string;
  onClick: () => void;
  level: 'all' | 'info' | 'warn' | 'error' | 'debug';
}) => {
  const lowerLog = log.toLowerCase();
  const detectedLevel =
    lowerLog.includes('error') || lowerLog.includes('fail') ? 'error' :
    lowerLog.includes('warn') ? 'warn' :
    lowerLog.includes('debug') ? 'debug' : 'info';

  const levelBadgeStyles = {
    error: cn(DesignTokens.colors.status.error.bg, DesignTokens.colors.status.error.border),
    warn: cn(DesignTokens.colors.status.warning.bg, DesignTokens.colors.status.warning.border),
    debug: cn(DesignTokens.colors.status.connecting.bg, DesignTokens.colors.status.connecting.border),
    info: 'bg-gray-800 text-gray-300',
  };
  const levelTextColors = {
    error: DesignTokens.colors.status.error.text,
    warn: DesignTokens.colors.status.warning.text,
    debug: DesignTokens.colors.status.connecting.text,
    info: DesignTokens.colors.text.secondary,
  };

  const matchesSearch = !searchQuery || lowerLog.includes(searchQuery.toLowerCase());
  const matchesFilter = level === 'all' || detectedLevel === level;

  if (!matchesSearch || !matchesFilter) return null;

  const highlight = (text: string) => {
    if (!searchQuery) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} className="bg-yellow-500/30 text-yellow-100 px-0.5 rounded">{part}</mark>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div
      key={index}
      onClick={onClick}
      className={cn(
        'break-words group hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors cursor-pointer',
        DesignTokens.colors.text.secondary,
        levelTextColors[detectedLevel]
      )}
      title="Click to copy"
    >
      <span className="text-gray-600 mr-2 select-none">[{index}]</span>
      <span className="flex items-center gap-1">
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded uppercase font-medium', levelBadgeStyles[detectedLevel])}>
          {detectedLevel.toUpperCase()}
        </span>
        {highlight(log)}
      </span>
    </div>
  );
};

const RunEventEntry = ({ event, index, searchQuery, onClick }: {
  event: RunEvent;
  index: number;
  searchQuery: string;
  onClick: () => void;
}) => {
  const typeConfig = RUN_EVENT_TYPE_COLORS[event.type];
  const label = RUN_EVENT_TYPE_LABELS[event.type];
  const agentName = event.data.agentName as string | undefined;
  const timestamp = new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });

  const highlight = (text: string) => {
    if (!searchQuery) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} className="bg-yellow-500/30 text-yellow-100 px-0.5 rounded">{part}</mark>
        : <span key={i}>{part}</span>
    );
  };

  let details = '';
  switch (event.type) {
    case 'match:found':
      details = `Score: ${(event.data.score as number)?.toFixed(2)} | Matched: ${event.data.matchedPubkey}`;
      break;
    case 'agent:action':
      details = `Action: ${event.data.action} | Method: ${event.data.inputMethod}`;
      break;
    case 'agent:spawn':
      details = `Role: ${event.data.role} | ID: ${event.data.id}`;
      break;
    case 'error':
      details = `Error: ${event.data.error} | Context: ${event.data.context}`;
      break;
    case 'event:scheduled':
    case 'event:executed':
      details = `Role: ${event.data.role} | Action: ${event.data.action}`;
      break;
    default:
      details = JSON.stringify(event.data).slice(0, 100);
  }

  return (
    <div
      key={index}
      onClick={onClick}
      className={cn(
        'break-words group hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors cursor-pointer border-l-2',
        typeConfig.bg,
        typeConfig.text
      )}
      title="Click to copy"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-gray-600 mr-1 select-none text-[10px] font-mono">[{timestamp}]</span>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded uppercase font-medium', typeConfig.bg, typeConfig.text)}>
          {typeConfig.icon}
          {label}
        </span>
        {agentName && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-medium">
            {agentName}
          </span>
        )}
      </div>
      <div className="ml-7 mt-0.5 text-[11px] text-gray-400">
        {highlight(details)}
      </div>
    </div>
  );
};

export const LogsPanel = () => {
  const {
    filteredLogs,
    filteredRunEvents,
    job,
    logFilter,
    setLogFilter,
    logSearch,
    setLogSearch,
    paused,
    setPaused,
    showLogPanel,
    setShowLogPanel,
    logPanelWidth,
    setLogPanelWidth,
    isResizingLogs,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleKeyDown,
    copyLogs,
    downloadLogs,
    downloadRunEvents,
    clearLogs,
    logsEndRef,
    runEventsEndRef,
    eventTypeFilter,
    setEventTypeFilter,
    agentFilter,
    setAgentFilter,
    showRunEvents,
    setShowRunEvents,
  } = useLogsPanel();

  const runEventTypes: RunEventFilterType[] = ['all', 'scenario:start', 'scenario:end', 'agent:spawn', 'agent:action', 'event:scheduled', 'event:executed', 'match:found', 'error'];

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-indigo-500/30 transition-colors -ml-0.5"
        onMouseDown={handleResizeStart}
        aria-label="Resize logs panel"
        role="separator"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const newWidth = Math.min(Math.max(logPanelWidth + (e.key === 'ArrowLeft' ? -20 : 20), 200), 600);
            setLogPanelWidth(newWidth);
          }
        }}
      />

      <Card
        variant="elevated"
        className={cn('min-w-[200px] max-w-[600px] flex flex-col', DesignTokens.breakpoints.logPanelMin, DesignTokens.breakpoints.logPanelMax)}
        style={{ width: `${logPanelWidth}px`, flexShrink: 0 }}
      >
        <CardHeader className={cn('p-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3', DesignTokens.colors.background.panel, DesignTokens.colors.border.muted)}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn('text-xs font-mono font-bold text-gray-400 flex items-center gap-1.5')}>
              <Terminal size={14} />
              SYSTEM LOGS
            </span>
            <Badge variant="default" size="sm">{filteredLogs.length} / {job?.logs.length ?? 0}</Badge>
            {job?.runEvents && job.runEvents.length > 0 && (
              <>
                <span className="text-gray-500 text-xs">|</span>
                <Badge variant="secondary" size="sm">
                  <Zap size={10} className="mr-1" />
                  Events: {filteredRunEvents.length} / {job.runEvents.length}
                </Badge>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <Input
                id="log-search"
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Filter logs/events..."
                className="w-48 sm:w-64"
                size="sm"
                aria-label="Filter logs"
                icon={logSearch && <X size={12} />}
                iconPosition="right"
              />
            </div>

            {showRunEvents && job?.runEvents && job.runEvents.length > 0 && (
              <>
                <Select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value as RunEventFilterType)}
                  options={runEventTypes.map(t => ({ value: t, label: t === 'all' ? 'All Events' : RUN_EVENT_TYPE_LABELS[t as RunEventType] || t }))}
                  className="text-xs max-w-[160px]"
                  size="sm"
                  aria-label="Filter by event type"
                />
                <Input
                  type="text"
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  placeholder="Filter by agent..."
                  className="w-32"
                  size="sm"
                  aria-label="Filter by agent name"
                  icon={agentFilter && <X size={12} />}
                  iconPosition="right"
                />
              </>
            )}

            <div className="flex items-center gap-1">
              <IconButton size="sm" onClick={copyLogs} aria-label="Copy filtered logs">
                <Copy size={14} />
              </IconButton>
              <IconButton size="sm" onClick={downloadLogs} aria-label="Download all logs">
                <Download size={14} />
              </IconButton>
              {showRunEvents && job?.runEvents && job.runEvents.length > 0 && (
                <IconButton size="sm" onClick={downloadRunEvents} aria-label="Download filtered events">
                  <Download size={14} />
                </IconButton>
              )}
              <IconButton size="sm" onClick={clearLogs} aria-label="Clear logs">
                <Trash2 size={14} />
              </IconButton>
              <Button
                variant={paused ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPaused(!paused)}
                aria-label={paused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
                aria-pressed={paused}
                icon={paused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
              />
              {job?.runEvents && job.runEvents.length > 0 && (
                <Button
                  variant={showRunEvents ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowRunEvents(!showRunEvents)}
                  aria-label={showRunEvents ? 'Hide run events' : 'Show run events'}
                  aria-pressed={showRunEvents}
                >
                  <Zap size={14} />
                  {showRunEvents ? 'Events' : 'Logs'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-2 font-mono text-xs space-y-0.5 custom-scrollbar">
          {showRunEvents && job?.runEvents && job.runEvents.length > 0 ? (
            filteredRunEvents.length === 0 ? (
              <div className="text-gray-500 text-center py-8 flex flex-col items-center gap-2">
                <Filter size={32} className="opacity-50" />
                <span>No matching events</span>
                {(eventTypeFilter !== 'all' || agentFilter) && (
                  <button onClick={() => { setEventTypeFilter('all'); setAgentFilter(''); }} className="text-xs text-indigo-400 hover:underline">Clear filters</button>
                )}
              </div>
            ) : (
              <>
                filteredRunEvents.map((event, originalIndex) => (
                  <RunEventEntry
                    key={originalIndex}
                    event={event}
                    index={originalIndex}
                    searchQuery={logSearch}
                    onClick={() => navigator.clipboard.writeText(`[${originalIndex}] ${event.type}: ${JSON.stringify(event.data)}`).then(() => {})}
                  />
                ))
                <div ref={runEventsEndRef} />
              </>
            )
          ) : (
            filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8 flex flex-col items-center gap-2">
                <Filter size={32} className="opacity-50" />
                <span>{logSearch || logFilter !== 'all' ? 'No matching logs' : 'No logs yet'}</span>
                {logSearch && <button onClick={() => setLogSearch('')} className="text-xs text-indigo-400 hover:underline">Clear search</button>}
                {logFilter !== 'all' && <button onClick={() => setLogFilter('all')} className="text-xs text-indigo-400 hover:underline">Show all levels</button>}
              </div>
            ) : (
              <>
                filteredLogs.map((log, originalIndex) => (
                  <LogEntry
                    key={originalIndex}
                    log={log}
                    index={originalIndex}
                    searchQuery={logSearch}
                    level={logFilter}
                    onClick={() => navigator.clipboard.writeText(`[${originalIndex}] ${log}`).then(() => {})}
                  />
                ))
                <div ref={logsEndRef} />
              </>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LogsPanel;