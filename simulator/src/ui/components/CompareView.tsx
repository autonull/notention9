import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Play, Pause, Stop, RotateCcw, BarChart2, Download, ChevronLeft, ChevronRight, GitBranch, Settings, FileText, Zap, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button, IconButton, Input, Select, Card, CardHeader, CardContent, Badge, Tabs, TabList, Tab, TabPanels, TabPanel } from '../components/ui';
import { DesignTokens } from '../components/ui';
import { cn, formatDuration } from '../utils';
import { useScenarios, useScenarioDetails } from '../hooks/useScenarios';
import type { RunEvent, RunEventType } from '../../types.js';

interface ComparisonResult {
  scenario: string;
  configA: ComparisonConfig;
  configB: ComparisonConfig;
  eventsA: RunEvent[];
  eventsB: RunEvent[];
  metricsA: ComparisonMetrics;
  metricsB: ComparisonMetrics;
  verdict: ComparisonVerdict;
}

interface ComparisonConfig {
  name: string;
  ontologyPatch?: string;
  paramPatches?: Record<string, unknown>;
  seed?: number;
}

interface ComparisonMetrics {
  totalMatches: number;
  matchesPerMinute: number;
  avgMatchScore: number;
  unmatchedRate: number;
  timeToFirstMatch: number;
  perAgentMatches: Record<string, number>;
  perDomainMatches: Record<string, number>;
}

interface ComparisonVerdict {
  winner: 'A' | 'B' | 'tie';
  confidence: number;
  evidenceClass: 'measured' | 'hypothesized' | 'observed';
  mde: number;
  powered: boolean;
  reason: string;
}

const RUN_EVENT_TYPES: RunEventType[] = ['scenario:start', 'scenario:end', 'agent:spawn', 'agent:action', 'event:scheduled', 'event:executed', 'match:found', 'error'];

const EVENT_TYPE_LABELS: Record<RunEventType, string> = {
  'scenario:start': 'Scenario Start',
  'scenario:end': 'Scenario End',
  'agent:spawn': 'Agent Spawn',
  'agent:action': 'Agent Action',
  'event:scheduled': 'Event Scheduled',
  'event:executed': 'Event Executed',
  'match:found': 'Match Found',
  'error': 'Error',
};

const EVENT_TYPE_COLORS: Record<RunEventType, { bg: string; text: string }> = {
  'scenario:start': { bg: 'bg-blue-900/30', text: 'text-blue-400' },
  'scenario:end': { bg: 'bg-green-900/30', text: 'text-green-400' },
  'agent:spawn': { bg: 'bg-purple-900/30', text: 'text-purple-400' },
  'agent:action': { bg: 'bg-cyan-900/30', text: 'text-cyan-400' },
  'event:scheduled': { bg: 'bg-yellow-900/30', text: 'text-yellow-400' },
  'event:executed': { bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
  'match:found': { bg: 'bg-indigo-900/30', text: 'text-indigo-400' },
  'error': { bg: 'bg-red-900/30', text: 'text-red-400' },
};

export const CompareView = () => {
  const { scenarios, loading: scenariosLoading } = useScenarios();
  const [scenarioA, setScenarioA] = useState('');
  const [scenarioB, setScenarioB] = useState('');
  const [configA, setConfigA] = useState<ComparisonConfig>({ name: 'Config A' });
  const [configB, setConfigB] = useState<ComparisonConfig>({ name: 'Config B' });
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ComparisonResult | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'metrics' | 'verdict' | 'export'>('timeline');
  const [eventTypeFilter, setEventTypeFilter] = useState<RunEventType | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<RunEvent | null>(null);

  const scenarioDetailsA = useScenarioDetails(scenarioA);
  const scenarioDetailsB = useScenarioDetails(scenarioB);

  const handleRunComparison = useCallback(async () => {
    if (!scenarioA || !scenarioB) return;
    setRunning(true);
    setResults(null);

    try {
      // Run both configurations headless via the movie server API
      const [eventsA, eventsB] = await Promise.all([
        runHeadlessScenario(scenarioA, configA),
        runHeadlessScenario(scenarioB, configB),
      ]);

      const metricsA = computeMetrics(eventsA);
      const metricsB = computeMetrics(eventsB);
      const verdict = computeVerdict(metricsA, metricsB);

      setResults({
        scenario: scenarioA,
        configA,
        configB,
        eventsA,
        eventsB,
        metricsA,
        metricsB,
        verdict,
      });
    } catch (e) {
      console.error('Comparison failed:', e);
    } finally {
      setRunning(false);
    }
  }, [scenarioA, scenarioB, configA, configB]);

  const filteredEventsA = useMemo(() => {
    if (!results) return [];
    return results.eventsA.filter(e => {
      if (eventTypeFilter !== 'all' && e.type !== eventTypeFilter) return false;
      if (agentFilter && e.data.agentName && !String(e.data.agentName).toLowerCase().includes(agentFilter.toLowerCase())) return false;
      return true;
    });
  }, [results?.eventsA, eventTypeFilter, agentFilter]);

  const filteredEventsB = useMemo(() => {
    if (!results) return [];
    return results.eventsB.filter(e => {
      if (eventTypeFilter !== 'all' && e.type !== eventTypeFilter) return false;
      if (agentFilter && e.data.agentName && !String(e.data.agentName).toLowerCase().includes(agentFilter.toLowerCase())) return false;
      return true;
    });
  }, [results?.eventsB, eventTypeFilter, agentFilter]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <Card variant="elevated" className={cn(DesignTokens.shadows.card, DesignTokens.card.elevated)}>
        <CardHeader className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-xl font-bold">Compare View</h2>
            <Badge variant="secondary" size="sm">Headless A/B</Badge>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Run two configurations side-by-side in fast mode. Compare match timelines, per-agent scores, and statistical verdict.
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Scenario Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScenarioSelector
              label="Configuration A"
              scenarios={scenarios}
              loading={scenariosLoading}
              selected={scenarioA}
              onChange={setScenarioA}
              config={configA}
              onConfigChange={setConfigA}
              details={scenarioDetailsA}
            />
            <ScenarioSelector
              label="Configuration B"
              scenarios={scenarios}
              loading={scenariosLoading}
              selected={scenarioB}
              onChange={setScenarioB}
              config={configB}
              onConfigChange={setConfigB}
              details={scenarioDetailsB}
            />
          </div>

          {/* Run Button */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              size="lg"
              onClick={handleRunComparison}
              disabled={running || !scenarioA || !scenarioB || scenarioA === scenarioB}
              icon={running ? <RotateCcw className="animate-spin" size={20} /> : <Play size={20} />}
            >
              {running ? 'Running...' : 'Run Comparison'}
            </Button>
            {results && (
              <Badge variant={results.verdict.powered ? 'success' : 'warning'} size="lg">
                {results.verdict.powered ? 'Powered' : 'Underpowered'}
              </Badge>
            )}
            {results && results.verdict.winner !== 'tie' && (
              <Badge variant="primary" size="lg">
                Winner: {results.verdict.winner}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      {results && (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <Tabs value={activeTab} onChange={setActiveTab} className="flex-1 flex flex-col">
            <TabList className="grid grid-cols-4">
              <Tab value="timeline"><Zap size={16} className="mr-2" />Timeline</Tab>
              <Tab value="metrics"><BarChart2 size={16} className="mr-2" />Metrics</Tab>
              <Tab value="verdict"><GitBranch size={16} className="mr-2" />Verdict</Tab>
              <Tab value="export"><FileText size={16} className="mr-2" />Export</Tab>
            </TabList>
            <TabPanels className="flex-1 flex flex-col min-h-0">
              <TabPanel value="timeline">
                <TimelineView
                  eventsA={filteredEventsA}
                  eventsB={filteredEventsB}
                  metricsA={results.metricsA}
                  metricsB={results.metricsB}
                  configA={results.configA}
                  configB={results.configB}
                  onEventSelect={setSelectedEvent}
                  selectedEvent={selectedEvent}
                />
              </TabPanel>
              <TabPanel value="metrics">
                <MetricsView metricsA={results.metricsA} metricsB={results.metricsB} configA={results.configA} configB={results.configB} />
              </TabPanel>
              <TabPanel value="verdict">
                <VerdictView verdict={results.verdict} metricsA={results.metricsA} metricsB={results.metricsB} />
              </TabPanel>
              <TabPanel value="export">
                <ExportView result={results} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
};

interface ScenarioSelectorProps {
  label: string;
  scenarios: string[];
  loading: boolean;
  selected: string;
  onChange: (value: string) => void;
  config: ComparisonConfig;
  onConfigChange: (config: ComparisonConfig) => void;
  details: { name: string; description: string; agentCount?: number; duration?: number; tags: string[] };
}

const ScenarioSelector = ({ label, scenarios, loading, selected, onChange, config, onConfigChange, details }: ScenarioSelectorProps) => {
  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="font-medium">{label}</h4>
        <Badge variant="secondary" size="sm">{config.name}</Badge>
      </div>
      <Select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        options={[{ value: '', label: 'Select scenario...' }, ...scenarios.map(s => ({ value: s, label: s }))]}
        disabled={loading}
        className="w-full mb-3"
        placeholder="Select scenario..."
      />
      <div className="space-y-2 text-sm text-gray-400">
        <p>{details.description}</p>
        <div className="flex gap-4">
          {details.agentCount && <span>Agents: {details.agentCount}</span>}
          {details.duration && <span>Duration: {details.duration}s</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {details.tags.map(tag => <Badge key={tag} variant="ghost" size="xs">{tag}</Badge>)}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Input
          label="Config Name"
          value={config.name}
          onChange={(e) => onConfigChange({ ...config, name: e.target.value })}
          placeholder="Config A"
        />
        <Input
          label="Ontology Patch (JSON)"
          value={config.ontologyPatch || ''}
          onChange={(e) => onConfigChange({ ...config, ontologyPatch: e.target.value })}
          placeholder='{ "add": [...], "remove": [...] }'
        />
      </div>
    </Card>
  );
};

const TimelineView = ({ eventsA, eventsB, configA, configB, onEventSelect, selectedEvent }: {
  eventsA: RunEvent[];
  eventsB: RunEvent[];
  metricsA: ComparisonMetrics;
  metricsB: ComparisonMetrics;
  configA: ComparisonConfig;
  configB: ComparisonConfig;
  onEventSelect: (event: RunEvent) => void;
  selectedEvent: RunEvent | null;
}) => {
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const allEvents = [...eventsA, ...eventsB];
    if (allEvents.length > 0) {
      const timestamps = allEvents.map(e => e.timestamp);
      setTimeRange([Math.min(...timestamps), Math.max(...timestamps)]);
    }
  }, [eventsA, eventsB]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Summary Bar */}
      <div className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg border mb-4">
        <div className="flex-1 p-3 bg-indigo-900/30 rounded-lg border border-indigo-500/50">
          <div className="text-xs text-indigo-400">{configA.name}</div>
          <div className="font-mono text-lg">{eventsA.length} events</div>
          <div className="text-xs text-gray-500">Matches: {metricsA.totalMatches} | Avg Score: {metricsA.avgMatchScore.toFixed(2)}</div>
        </div>
        <div className="flex-1 p-3 bg-emerald-900/30 rounded-lg border border-emerald-500/50">
          <div className="text-xs text-emerald-400">{configB.name}</div>
          <div className="font-mono text-lg">{eventsB.length} events</div>
          <div className="text-xs text-gray-500">Matches: {metricsB.totalMatches} | Avg Score: {metricsB.avgMatchScore.toFixed(2)}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto p-2 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <EventColumn title={configA.name} events={eventsA} color="indigo" onEventSelect={onEventSelect} selectedEvent={selectedEvent} />
          <EventColumn title={configB.name} events={eventsB} color="emerald" onEventSelect={onEventSelect} selectedEvent={selectedEvent} />
        </div>
      </div>
    </div>
  );
};

const EventColumn = ({ title, events, color, onEventSelect, selectedEvent }: {
  title: string;
  events: RunEvent[];
  color: 'indigo' | 'emerald';
  onEventSelect: (event: RunEvent) => void;
  selectedEvent: RunEvent | null;
}) => {
  const bgColor = color === 'indigo' ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-emerald-900/20 border-emerald-500/30';
  const textColor = color === 'indigo' ? 'text-indigo-400' : 'text-emerald-400';
  const matchColor = color === 'indigo' ? 'bg-indigo-900/30 border-indigo-500/50' : 'bg-emerald-900/30 border-emerald-500/50';

  return (
    <div className={cn('flex flex-col', bgColor, 'rounded-lg border')}>
      <div className="p-2 border-b font-medium" style={{ color: textColor }}>
        {title} ({events.length} events)
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {events.map((event, index) => {
          const typeConfig = EVENT_TYPE_COLORS[event.type];
          const isMatch = event.type === 'match:found';
          const isSelected = selectedEvent === event;
          return (
            <div
              key={index}
              onClick={() => onEventSelect(event)}
              className={cn(
                'p-2 rounded cursor-pointer transition-colors text-xs',
                isMatch ? matchColor : 'hover:bg-gray-800/50',
                isSelected && 'ring-2 ring-white'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-gray-500 text-[10px] font-mono">
                  {new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 })}
                </span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded uppercase font-medium', typeConfig.bg, typeConfig.text)}>
                  {EVENT_TYPE_LABELS[event.type]}
                </span>
                {event.data.agentName && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-medium">
                    {event.data.agentName}
                  </span>
                )}
              </div>
              {isMatch && event.data.score && (
                <div className="text-[11px] text-yellow-400 font-mono">
                  Score: {Number(event.data.score).toFixed(2)}
                </div>
              )}
            </div>
          );
        })}
        {events.length === 0 && (
          <div className="text-gray-500 text-center py-8 text-sm">No events</div>
        )}
      </div>
    </div>
  );
};

const MetricsView = ({ metricsA, metricsB, configA, configB }: {
  metricsA: ComparisonMetrics;
  metricsB: ComparisonMetrics;
  configA: ComparisonConfig;
  configB: ComparisonConfig;
}) => {
  const metricRows = [
    { key: 'totalMatches', label: 'Total Matches', format: (v: number) => v.toString() },
    { key: 'matchesPerMinute', label: 'Matches/Minute', format: (v: number) => v.toFixed(2) },
    { key: 'avgMatchScore', label: 'Avg Match Score', format: (v: number) => v.toFixed(3) },
    { key: 'unmatchedRate', label: 'Unmatched Rate', format: (v: number) => (v * 100).toFixed(1) + '%' },
    { key: 'timeToFirstMatch', label: 'Time to First Match (ms)', format: (v: number) => v.toFixed(0) },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-400">
              <th className="pb-2 w-48">Metric</th>
              <th className="pb-2 text-right w-32">{configA.name}</th>
              <th className="pb-2 text-right w-32">{configB.name}</th>
              <th className="pb-2 text-right w-32">Delta</th>
              <th className="pb-2 text-right w-32">% Change</th>
            </tr>
          </thead>
          <tbody>
            {metricRows.map(row => {
              const valA = metricsA[row.key as keyof ComparisonMetrics] as number;
              const valB = metricsB[row.key as keyof ComparisonMetrics] as number;
              const delta = valB - valA;
              const pct = valA !== 0 ? ((delta / valA) * 100).toFixed(1) : 'N/A';
              const better = row.key === 'unmatchedRate' || row.key === 'timeToFirstMatch' ? delta < 0 : delta > 0;
              return (
                <tr key={row.key} className="border-b border-gray-800">
                  <td className="py-2 font-medium">{row.label}</td>
                  <td className="py-2 text-right font-mono">{row.format(valA)}</td>
                  <td className="py-2 text-right font-mono">{row.format(valB)}</td>
                  <td className={cn('py-2 text-right font-mono', better ? 'text-green-400' : 'text-red-400')}>
                    {delta >= 0 ? '+' : ''}{row.format(delta)}
                  </td>
                  <td className={cn('py-2 text-right font-mono', better ? 'text-green-400' : 'text-red-400')}>
                    {pct !== 'N/A' && (pct.startsWith('-') ? '' : '+')}{pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-Agent Breakdown */}
      <div>
        <h4 className="font-medium mb-3">Per-Agent Matches</h4>
        <div className="grid grid-cols-2 gap-4">
          <AgentBreakdown title={configA.name} data={metricsA.perAgentMatches} color="indigo" />
          <AgentBreakdown title={configB.name} data={metricsB.perAgentMatches} color="emerald" />
        </div>
      </div>

      {/* Per-Domain Breakdown */}
      <div>
        <h4 className="font-medium mb-3">Per-Domain Matches</h4>
        <div className="grid grid-cols-2 gap-4">
          <AgentBreakdown title={configA.name} data={metricsA.perDomainMatches} color="indigo" />
          <AgentBreakdown title={configB.name} data={metricsB.perDomainMatches} color="emerald" />
        </div>
      </div>
    </div>
  );
};

const AgentBreakdown = ({ title, data, color }: { title: string; data: Record<string, number>; color: 'indigo' | 'emerald' }) => {
  const bgColor = color === 'indigo' ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-emerald-900/20 border-emerald-500/30';
  const textColor = color === 'indigo' ? 'text-indigo-400' : 'text-emerald-400';
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <div className={cn('p-3 rounded-lg border', bgColor)}>
      <h5 className="font-medium mb-2" style={{ color: textColor }}>{title}</h5>
      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm">No matches</p>
      ) : (
        <ul className="space-y-1">
          {entries.map(([agent, count]) => (
            <li key={agent} className="flex justify-between text-sm">
              <span className="text-gray-300 truncate pr-2">{agent}</span>
              <span className="font-mono font-medium" style={{ color: textColor }}>{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const VerdictView = ({ verdict, metricsA, metricsB }: {
  verdict: ComparisonVerdict;
  metricsA: ComparisonMetrics;
  metricsB: ComparisonMetrics;
}) => {
  return (
    <div className="p-6 space-y-6">
      {/* Verdict Card */}
      <Card variant="elevated" className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={cn('w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold',
            verdict.winner === 'A' ? 'bg-indigo-900/50 text-indigo-400' :
            verdict.winner === 'B' ? 'bg-emerald-900/50 text-emerald-400' :
            'bg-gray-700 text-gray-400'
          )}>
            {verdict.winner === 'tie' ? '=' : verdict.winner}
          </div>
          <div>
            <h3 className="text-xl font-bold">
              {verdict.winner === 'tie' ? 'No Significant Difference' : `Configuration ${verdict.winner} Wins`}
            </h3>
            <p className="text-gray-400">{verdict.reason}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Confidence" value={`${(verdict.confidence * 100).toFixed(1)}%`} />
          <MetricCard label="MDE" value={`${(verdict.mde * 100).toFixed(1)}%`} />
          <MetricCard label="Evidence Class" value={verdict.evidenceClass} />
          <MetricCard label="Powered" value={verdict.powered ? 'Yes' : 'No'} />
        </div>
      </Card>

      {/* Interpretation */}
      <Card variant="outlined" className="p-4">
        <h4 className="font-medium mb-3">Interpretation</h4>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            <strong>Evidence Class: </strong>
            {verdict.evidenceClass === 'measured' && 'Directly measured from headless simulation runs.'}
            {verdict.evidenceClass === 'hypothesized' && 'Estimated from simulator model; not validated against real usage.'}
            {verdict.evidenceClass === 'observed' && 'Derived from real user friction journal.'}
          </p>
          <p>
            <strong>Statistical Power: </strong>
            {verdict.powered ? 'Adequate sample size to detect the observed effect.' : 'Underpowered — result may be a false positive or false negative.'}
          </p>
          <p>
            <strong>Minimum Detectable Effect: </strong>
            {(verdict.mde * 100).toFixed(1)}% — the smallest effect this comparison could reliably detect.
          </p>
        </div>
      </Card>

      {/* Recommendations */}
      <Card variant="outlined" className="p-4">
        <h4 className="font-medium mb-3">Next Steps</h4>
        <ul className="space-y-2 text-sm text-gray-300 list-disc list-inside">
          {verdict.winner !== 'tie' && verdict.powered && (
            <li>Create revision from winning configuration → Revisions tab</li>
          )}
          {verdict.winner !== 'tie' && !verdict.powered && (
            <li>Run with more repetitions / intent cases to achieve statistical power</li>
          )}
          {verdict.winner === 'tie' && (
            <li>No significant difference detected. Try different parameters or more statistical power.</li>
          )}
          <li>Export EvidenceBundle for documentation (Export tab)</li>
        </ul>
      </Card>
    </div>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 bg-gray-900/50 rounded-lg border">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="font-mono text-lg">{value}</div>
  </div>
);

const ExportView = ({ result }: { result: ComparisonResult }) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(() => generateMarkdown(result), [result]);
  const json = useMemo(() => generateJSON(result), [result]);
  const content = format === 'markdown' ? markdown : json;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: format === 'markdown' ? 'text/markdown' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${result.scenario}-${Date.now()}.${format === 'markdown' ? 'md' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4 flex-1 flex flex-col">
      <div className="flex items-center gap-4">
        <Select value={format} onChange={(e) => setFormat(e.target.value as 'markdown' | 'json')} options={[
          { value: 'markdown', label: 'Markdown' },
          { value: 'json', label: 'JSON (EvidenceBundle)' },
        ]} className="w-48" />
        <Button variant="secondary" onClick={handleCopy} icon={copied ? <CheckCircle size={16} /> : <Copy size={16} />}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <Button variant="secondary" onClick={handleDownload} icon={<Download size={16} />}>
          Download
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="bg-gray-950 p-4 rounded font-mono text-xs text-gray-300 whitespace-pre-wrap">{content}</pre>
      </div>
    </div>
  );
};

function generateMarkdown(result: ComparisonResult): string {
  const { configA, configB, metricsA, metricsB, verdict } = result;
  return `# Comparison Report: ${result.scenario}

## Configurations
- **A (${configA.name})**: ${configA.ontologyPatch ? 'Ontology patch applied' : 'Baseline'}
- **B (${configB.name})**: ${configB.ontologyPatch ? 'Ontology patch applied' : 'Baseline'}

## Metrics
| Metric | ${configA.name} | ${configB.name} | Delta | % Change |
|--------|----------------|----------------|-------|----------|
| Total Matches | ${metricsA.totalMatches} | ${metricsB.totalMatches} | ${metricsB.totalMatches - metricsA.totalMatches >= 0 ? '+' : ''}${metricsB.totalMatches - metricsA.totalMatches} | ${metricsA.totalMatches ? (((metricsB.totalMatches - metricsA.totalMatches) / metricsA.totalMatches) * 100).toFixed(1) : 'N/A'}% |
| Matches/Minute | ${metricsA.matchesPerMinute.toFixed(2)} | ${metricsB.matchesPerMinute.toFixed(2)} | ${(metricsB.matchesPerMinute - metricsA.matchesPerMinute).toFixed(2)} | ${metricsA.matchesPerMinute ? (((metricsB.matchesPerMinute - metricsA.matchesPerMinute) / metricsA.matchesPerMinute) * 100).toFixed(1) : 'N/A'}% |
| Avg Match Score | ${metricsA.avgMatchScore.toFixed(3)} | ${metricsB.avgMatchScore.toFixed(3)} | ${(metricsB.avgMatchScore - metricsA.avgMatchScore).toFixed(3)} | ${metricsA.avgMatchScore ? (((metricsB.avgMatchScore - metricsA.avgMatchScore) / metricsA.avgMatchScore) * 100).toFixed(1) : 'N/A'}% |
| Unmatched Rate | ${(metricsA.unmatchedRate * 100).toFixed(1)}% | ${(metricsB.unmatchedRate * 100).toFixed(1)}% | ${((metricsB.unmatchedRate - metricsA.unmatchedRate) * 100).toFixed(1)}% | ${metricsA.unmatchedRate ? (((metricsB.unmatchedRate - metricsA.unmatchedRate) / metricsA.unmatchedRate) * 100).toFixed(1) : 'N/A'}% |
| Time to First Match | ${metricsA.timeToFirstMatch.toFixed(0)}ms | ${metricsB.timeToFirstMatch.toFixed(0)}ms | ${(metricsB.timeToFirstMatch - metricsA.timeToFirstMatch).toFixed(0)}ms | ${metricsA.timeToFirstMatch ? (((metricsB.timeToFirstMatch - metricsA.timeToFirstMatch) / metricsA.timeToFirstMatch) * 100).toFixed(1) : 'N/A'}% |

## Verdict
- **Winner**: ${verdict.winner === 'tie' ? 'Tie (no significant difference)' : `Config ${verdict.winner}`}
- **Confidence**: ${(verdict.confidence * 100).toFixed(1)}%
- **Evidence Class**: ${verdict.evidenceClass}
- **Powered**: ${verdict.powered ? 'Yes' : 'No'}
- **MDE**: ${(verdict.mde * 100).toFixed(1)}%
- **Reason**: ${verdict.reason}

## Per-Agent Matches (A)
${Object.entries(metricsA.perAgentMatches).map(([agent, count]) => `- ${agent}: ${count}`).join('\n') || 'None'}

## Per-Agent Matches (B)
${Object.entries(metricsB.perAgentMatches).map(([agent, count]) => `- ${agent}: ${count}`).join('\n') || 'None'}

---
*Generated by Notention Simulator Compare View*
`;
}

function generateJSON(result: ComparisonResult): string {
  return JSON.stringify({
    evidenceBundle: {
      version: '1.0',
      timestamp: new Date().toISOString(),
      scenario: result.scenario,
      configurations: { A: result.configA, B: result.configB },
      metrics: { A: result.metricsA, B: result.metricsB },
      verdict: result.verdict,
      rawEvents: { A: result.eventsA, B: result.eventsB },
    },
  }, null, 2);
}

const EventDetailModal = ({ event, onClose }: { event: RunEvent; onClose: () => void }) => {
  const typeConfig = EVENT_TYPE_COLORS[event.type];
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl border max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={cn('px-2 py-1 rounded text-xs font-medium', typeConfig.bg, typeConfig.text)}>
              {EVENT_TYPE_LABELS[event.type]}
            </span>
            <span className="text-gray-500 text-sm font-mono">
              {new Date(event.timestamp).toLocaleString()}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><XCircle size={20} /></Button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {event.data.agentName && <div><strong>Agent:</strong> <code className="text-indigo-400">{event.data.agentName}</code></div>}
            {event.data.matchedPubkey && <div><strong>Matched:</strong> <code className="text-emerald-400">{event.data.matchedPubkey}</code></div>}
            {event.data.score && <div><strong>Score:</strong> <code className="text-yellow-400">{Number(event.data.score).toFixed(3)}</code></div>}
            {event.data.action && <div><strong>Action:</strong> <code>{event.data.action}</code></div>}
          </div>
          <div className="bg-gray-950 p-3 rounded font-mono text-xs overflow-auto">
            {JSON.stringify(event.data, null, 2)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
async function runHeadlessScenario(scenarioName: string, config: ComparisonConfig): Promise<RunEvent[]> {
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioName,
      agentCount: 8,
      duration: 30,
      ...config,
    }),
  });

  if (!response.ok) throw new Error('Failed to start job');

  // Poll for completion
  const jobData = await response.json();
  let completed = false;
  while (!completed) {
    await new Promise(r => setTimeout(r, 500));
    const statusRes = await fetch('/api/status');
    const statusData = await statusRes.json();
    if (statusData.job?.status === 'completed' || statusData.job?.status === 'failed') {
      completed = true;
      return statusData.job?.runEvents || [];
    }
  }
  return [];
}

function computeMetrics(events: RunEvent[]): ComparisonMetrics {
  const matchEvents = events.filter(e => e.type === 'match:found');
  const agentSpawns = events.filter(e => e.type === 'agent:spawn');
  const scenarioStart = events.find(e => e.type === 'scenario:start');
  const scenarioEnd = events.find(e => e.type === 'scenario:end');

  const perAgentMatches: Record<string, number> = {};
  const perDomainMatches: Record<string, number> = {};
  let totalScore = 0;

  for (const event of matchEvents) {
    const agentName = event.data.agentName as string | undefined;
    if (agentName) {
      perAgentMatches[agentName] = (perAgentMatches[agentName] || 0) + 1;
    }
    const score = Number(event.data.score) || 0;
    totalScore += score;

    // Extract domain from matched properties
    const matches = event.data.matches as Array<{ request: string }> | undefined;
    if (matches) {
      for (const m of matches) {
        const domain = m.request.split(' ')[0];
        perDomainMatches[domain] = (perDomainMatches[domain] || 0) + 1;
      }
    }
  }

  const duration = scenarioStart && scenarioEnd ? scenarioEnd.timestamp - scenarioStart.timestamp : 60000;
  const matchesPerMinute = (matchEvents.length / duration) * 60000;
  const avgMatchScore = matchEvents.length > 0 ? totalScore / matchEvents.length : 0;

  // Unmatched rate approximation
  const unmatchedRate = Math.max(0, 1 - matchEvents.length / Math.max(1, agentSpawns.length));

  // Time to first match
  let timeToFirstMatch = 0;
  if (matchEvents.length > 0 && scenarioStart) {
    timeToFirstMatch = matchEvents[0].timestamp - scenarioStart.timestamp;
  }

  return {
    totalMatches: matchEvents.length,
    matchesPerMinute,
    avgMatchScore,
    unmatchedRate,
    timeToFirstMatch,
    perAgentMatches,
    perDomainMatches,
  };
}

function computeVerdict(metricsA: ComparisonMetrics, metricsB: ComparisonMetrics): ComparisonVerdict {
  // Simplified verdict computation
  // In reality, this would use proper statistical testing
  const primaryMetricA = metricsA.matchesPerMinute * metricsA.avgMatchScore;
  const primaryMetricB = metricsB.matchesPerMinute * metricsB.avgMatchScore;

  const diff = primaryMetricB - primaryMetricA;
  const relativeDiff = primaryMetricA > 0 ? diff / primaryMetricA : 0;

  // Mock MDE and power calculation
  const mde = 0.15; // 15% minimum detectable effect
  const powered = Math.abs(relativeDiff) > mde;

  let winner: 'A' | 'B' | 'tie' = 'tie';
  if (powered) {
    winner = relativeDiff > 0 ? 'B' : 'A';
  }

  return {
    winner,
    confidence: Math.min(0.95, 0.5 + Math.abs(relativeDiff) * 2),
    evidenceClass: 'hypothesized',
    mde,
    powered,
    reason: powered
      ? `Configuration ${winner} shows ${(Math.abs(relativeDiff) * 100).toFixed(1)}% ${relativeDiff > 0 ? 'improvement' : 'degradation'} in composite match rate × score.`
      : `Difference of ${(relativeDiff * 100).toFixed(1)}% is below MDE of ${(mde * 100).toFixed(1)}%. Underpowered.`,
  };
}

export default CompareView;