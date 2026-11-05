import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Play, Pause, Stop, RotateCcw, BarChart2, Download, Settings, FileText, Zap, GitBranch, Code, Terminal, Save, Trash2, ChevronLeft, ChevronRight, X, Check, AlertCircle, Info, Layers, SlidersHorizontal, Database, Download as DownloadIcon } from 'lucide-react';
import { Button, IconButton, Input, Select, Card, CardHeader, CardContent, Badge, Tabs, TabList, Tab, TabPanels, TabPanel, Textarea, Modal, ConfirmModal } from '../components/ui';
import { DesignTokens } from '../components/ui';
import { cn, formatDuration } from '../utils';
import { useScenarios, useScenarioDetails } from '../hooks/useScenarios';
import { useToast } from '../components/ui';
import type { RunEvent, Scenario, RunEventType, OntologyNode } from '../../types.js';

interface LabRunConfig {
  scenario: string;
  ontologyPatch: string;
  paramPatches: string;
  repetitions: number;
  fastMode: boolean;
  seed: number;
}

interface LabRunResult {
  id: string;
  config: LabRunConfig;
  events: RunEvent[];
  metrics: LabMetrics;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  error?: string;
}

interface LabMetrics {
  totalMatches: number;
  matchesPerMinute: number;
  avgMatchScore: number;
  unmatchedRate: number;
  timeToFirstMatch: number;
  perAgentMatches: Record<string, number>;
  perDomainMatches: Record<string, number>;
  matchScoreDistribution: number[];
}

interface HistogramBin {
  range: string;
  count: number;
  percentage: number;
}

const RUN_EVENT_TYPES: RunEventType[] = ['scenario:start', 'scenario:end', 'agent:spawn', 'agent:action', 'event:scheduled', 'event:executed', 'match:found', 'error'];

export const LabView = () => {
  const { scenarios, loading: scenariosLoading } = useScenarios();
  const [config, setConfig] = useState<LabRunConfig>({
    scenario: '',
    ontologyPatch: '',
    paramPatches: '{}',
    repetitions: 3,
    fastMode: true,
    seed: Date.now(),
  });
  const [running, setRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<LabRunResult | null>(null);
  const [runHistory, setRunHistory] = useState<LabRunResult[]>([]);
  const [activeTab, setActiveTab] = useState<'config' | 'results' | 'history' | 'export'>('config');
  const [selectedRun, setSelectedRun] = useState<LabRunResult | null>(null);
  const [showSaveConfig, setShowSaveConfig] = useState(false);
  const [saveConfigName, setSaveConfigName] = useState('');
  const { addToast } = useToast();

  const scenarioDetails = useScenarioDetails(config.scenario);

  const handleRun = useCallback(async () => {
    if (!config.scenario) {
      addToast('Please select a scenario', 'error');
      return;
    }

    setRunning(true);
    const runId = `lab-${Date.now()}`;
    const newRun: LabRunResult = {
      id: runId,
      config: { ...config },
      events: [],
      metrics: {
        totalMatches: 0,
        matchesPerMinute: 0,
        avgMatchScore: 0,
        unmatchedRate: 0,
        timeToFirstMatch: 0,
        perAgentMatches: {},
        perDomainMatches: {},
        matchScoreDistribution: [],
      },
      status: 'running',
      startedAt: new Date().toISOString(),
    };

    setCurrentRun(newRun);
    setRunHistory(prev => [newRun, ...prev]);

    try {
      // Run multiple repetitions
      const allEvents: RunEvent[] = [];
      for (let i = 0; i < config.repetitions; i++) {
        if (newRun.status === 'cancelled') break;
        const events = await runHeadlessScenario(config.scenario, config, config.seed + i);
        allEvents.push(...events);
      }

      const metrics = computeMetrics(allEvents);
      setCurrentRun(prev => prev ? { ...prev, events: allEvents, metrics, status: 'completed', completedAt: new Date().toISOString() } : null);
      setRunHistory(prev => prev.map(r => r.id === runId ? { ...r, events: allEvents, metrics, status: 'completed', completedAt: new Date().toISOString() } : r));
      addToast(`Lab run completed: ${metrics.totalMatches} matches`, 'success');
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      setCurrentRun(prev => prev ? { ...prev, status: 'failed', error, completedAt: new Date().toISOString() } : null);
      setRunHistory(prev => prev.map(r => r.id === runId ? { ...r, status: 'failed', error, completedAt: new Date().toISOString() } : r));
      addToast(`Lab run failed: ${error}`, 'error');
    } finally {
      setRunning(false);
    }
  }, [config, addToast]);

  const handleCancel = useCallback(() => {
    setCurrentRun(prev => prev ? { ...prev, status: 'cancelled' } : null);
    setRunning(false);
    addToast('Lab run cancelled', 'info');
  }, [addToast]);

  const handleSaveConfig = useCallback(() => {
    setShowSaveConfig(true);
  }, []);

  const handleConfirmSave = useCallback(() => {
    // In real implementation, save to localStorage or file
    addToast(`Configuration "${saveConfigName}" saved`, 'success');
    setShowSaveConfig(false);
    setSaveConfigName('');
  }, [saveConfigName, addToast]);

  const handleLoadHistoryRun = useCallback((run: LabRunResult) => {
    setConfig(run.config);
    setSelectedRun(run);
    setActiveTab('results');
  }, []);

  const handleDeleteHistoryRun = useCallback((id: string) => {
    setRunHistory(prev => prev.filter(r => r.id !== id));
    addToast('Run deleted', 'info');
  }, [addToast]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <Card variant="elevated" className={cn(DesignTokens.shadows.card, DesignTokens.card.elevated)}>
        <CardHeader className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-xl font-bold">Developer Lab</h2>
            <Badge variant="secondary" size="sm">Headless Experimentation</Badge>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Run controlled experiments: pick scenario, apply ontology/param patches, run ×N headless, analyze distributions.
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <Tabs value={activeTab} onChange={setActiveTab} className="w-full">
            <TabList className="grid grid-cols-4">
              <Tab value="config"><Settings size={16} className="mr-2" />Config</Tab>
              <Tab value="results"><BarChart2 size={16} className="mr-2" />Results</Tab>
              <Tab value="history"><Database size={16} className="mr-2" />History</Tab>
              <Tab value="export"><FileText size={16} className="mr-2" />Export</Tab>
            </TabList>
            <TabPanels className="mt-4">
              <TabPanel value="config">
                <LabConfigPanel
                  config={config}
                  setConfig={setConfig}
                  scenarios={scenarios}
                  loading={scenariosLoading}
                  scenarioDetails={scenarioDetails}
                  onSave={handleSaveConfig}
                />
              </TabPanel>
              <TabPanel value="results">
                <LabResultsPanel
                  run={currentRun}
                  running={running}
                  onRun={handleRun}
                  onCancel={handleCancel}
                />
              </TabPanel>
              <TabPanel value="history">
                <LabHistoryPanel
                  history={runHistory}
                  onLoad={handleLoadHistoryRun}
                  onDelete={handleDeleteHistoryRun}
                />
              </TabPanel>
              <TabPanel value="export">
                <LabExportPanel run={currentRun} history={runHistory} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardContent>
      </Card>

      {/* Save Config Modal */}
      <Modal
        isOpen={showSaveConfig}
        onClose={() => setShowSaveConfig(false)}
        title="Save Configuration"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Configuration Name"
            value={saveConfigName}
            onChange={(e) => setSaveConfigName(e.target.value)}
            placeholder="my-experiment-config"
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowSaveConfig(false)}>Cancel</Button>
            <Button onClick={handleConfirmSave} disabled={!saveConfigName.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Run Detail Modal */}
      {selectedRun && (
        <LabRunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
};

const LabConfigPanel = ({ config, setConfig, scenarios, loading, scenarioDetails, onSave }: {
  config: LabRunConfig;
  setConfig: React.Dispatch<React.SetStateAction<LabRunConfig>>;
  scenarios: string[];
  loading: boolean;
  scenarioDetails: { name: string; description: string; agentCount?: number; duration?: number; tags: string[] };
  onSave: () => void;
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Scenario Selection */}
      <Card variant="outlined" className="p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Layers size={18} /> Scenario
        </h3>
        <Select
          value={config.scenario}
          onChange={(e) => setConfig({ ...config, scenario: e.target.value })}
          options={[{ value: '', label: 'Select scenario...' }, ...scenarios.map(s => ({ value: s, label: s }))]}
          disabled={loading}
          className="w-full mb-4"
          placeholder="Select scenario..."
        />
        {config.scenario && (
          <div className="space-y-2 text-sm text-gray-400">
            <p>{scenarioDetails.description}</p>
            <div className="flex gap-4">
              {scenarioDetails.agentCount && <span>Agents: {scenarioDetails.agentCount}</span>}
              {scenarioDetails.duration && <span>Duration: {scenarioDetails.duration}s</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {scenarioDetails.tags.map(tag => <Badge key={tag} variant="ghost" size="xs">{tag}</Badge>)}
            </div>
          </div>
        )}
      </Card>

      {/* Run Parameters */}
      <Card variant="outlined" className="p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <SlidersHorizontal size={18} /> Run Parameters
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Repetitions</label>
              <Select
                value={config.repetitions.toString()}
                onChange={(e) => setConfig({ ...config, repetitions: parseInt(e.target.value) })}
                options={[{ value: '1', label: '1' }, { value: '3', label: '3' }, { value: '5', label: '5' }, { value: '10', label: '10' }]}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Random Seed</label>
              <Input
                type="number"
                value={config.seed}
                onChange={(e) => setConfig({ ...config, seed: parseInt(e.target.value) || Date.now() })}
                className="font-mono"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.fastMode}
                onChange={(e) => setConfig({ ...config, fastMode: e.target.checked })}
                className="rounded border-gray-600"
              />
              <span>Fast Mode (virtual clock, 10-100× throughput)</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Ontology Patch */}
      <Card variant="outlined" className="p-4 lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium flex items-center gap-2">
            <Code size={18} /> Ontology Patch (JSON)
          </h3>
          <Button variant="ghost" size="sm" onClick={onSave} icon={<Save size={14} />}>Save Config</Button>
        </div>
        <Textarea
          value={config.ontologyPatch}
          onChange={(e) => setConfig({ ...config, ontologyPatch: e.target.value })}
          placeholder='{ "add": [{ "key": "newProp", "type": "string", "operator": "is" }], "remove": ["oldProp"] }'
          rows={6}
          className="font-mono text-xs w-full"
        />
        <p className="text-xs text-gray-500 mt-2">
          Define ontology modifications. Use <code className="font-mono">add</code> for new properties, <code className="font-mono">remove</code> for deprecation.
        </p>
      </Card>

      {/* Param Patches */}
      <Card variant="outlined" className="p-4 lg:col-span-2">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <SlidersHorizontal size={18} /> Parameter Patches (JSON)
        </h3>
        <Textarea
          value={config.paramPatches}
          onChange={(e) => setConfig({ ...config, paramPatches: e.target.value })}
          placeholder='{ "templateSelector": { "threshold": 0.7 }, "propertyForm": { "autoComplete": true } }'
          rows={4}
          className="font-mono text-xs w-full"
        />
        <p className="text-xs text-gray-500 mt-2">
          Override seam parameters for this experiment. Validated against ParamSpec at runtime.
        </p>
      </Card>
    </div>
  );
};

const LabResultsPanel = ({ run, running, onRun, onCancel }: {
  run: LabRunResult | null;
  running: boolean;
  onRun: () => void;
  onCancel: () => void;
}) => {
  if (!run) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Zap size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg">No run yet</p>
        <p className="text-sm mt-1">Configure experiment and click Run</p>
        <Button onClick={onRun} className="mt-4" icon={<Play size={18} />} size="lg">
          Run Experiment
        </Button>
      </div>
    );
  }

  const statusConfig = {
    running: { color: 'text-blue-400', bg: 'bg-blue-900/30', icon: <Zap className="animate-spin" size={14} /> },
    completed: { color: 'text-green-400', bg: 'bg-green-900/30', icon: <Check size={14} /> },
    failed: { color: 'text-red-400', bg: 'bg-red-900/30', icon: <AlertCircle size={14} /> },
    cancelled: { color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: <X size={14} /> },
  }[run.status];

  return (
    <div className="flex flex-col h-full">
      {/* Run Header */}
      <Card variant="outlined" className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', statusConfig.bg, statusConfig.color)}>
              {statusConfig.icon}
            </div>
            <div>
              <h3 className="font-medium">{run.id}</h3>
              <p className="text-sm text-gray-400">{run.config.scenario} × {run.config.repetitions} reps</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {running ? (
              <Button variant="danger" onClick={onCancel} icon={<Stop size={16} />} size="lg">Cancel</Button>
            ) : run.status === 'completed' ? (
              <Button variant="primary" onClick={onRun} icon={<RotateCcw size={16} />} size="lg">Re-run</Button>
            ) : (
              <Button variant="primary" onClick={onRun} icon={<Play size={16} />} size="lg">Run</Button>
            )}
          </div>
        </div>
      </Card>

      {/* Metrics Summary */}
      {run.status === 'completed' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetricCard label="Total Matches" value={run.metrics.totalMatches} icon={<Zap size={18} />} color="indigo" />
          <MetricCard label="Matches/min" value={run.metrics.matchesPerMinute.toFixed(2)} icon={<BarChart2 size={18} />} color="emerald" />
          <MetricCard label="Avg Score" value={run.metrics.avgMatchScore.toFixed(3)} icon={<Zap size={18} />} color="yellow" />
          <MetricCard label="Unmatched %" value={`${(run.metrics.unmatchedRate * 100).toFixed(1)}%`} icon={<AlertCircle size={18} />} color="red" />
        </div>
      )}

      {/* Histograms */}
      {run.status === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HistogramCard
            title="Time to First Match (ms)"
            data={[run.metrics.timeToFirstMatch]}
            bins={10}
            color="indigo"
          />
          <HistogramCard
            title="Match Score Distribution"
            data={run.metrics.matchScoreDistribution}
            bins={10}
            color="emerald"
          />
          <HistogramCard
            title="Per-Agent Matches"
            data={Object.values(run.metrics.perAgentMatches).map(v => v)}
            bins={5}
            color="yellow"
          />
          <HistogramCard
            title="Per-Domain Matches"
            data={Object.values(run.metrics.perDomainMatches).map(v => v)}
            bins={5}
            color="purple"
          />
        </div>
      )}

      {/* Event Timeline */}
      {run.events.length > 0 && (
        <Card variant="outlined" className="mt-4 flex-1 overflow-hidden">
          <CardHeader className="p-3">
            <h4 className="font-medium">Event Timeline ({run.events.length} events)</h4>
          </CardHeader>
          <CardContent className="p-3 h-[300px] overflow-auto">
            <div className="space-y-1">
              {run.events.slice(0, 100).map((event, index) => (
                <LabEventEntry key={index} event={event} index={index} />
              ))}
              {run.events.length > 100 && (
                <div className="text-center text-gray-500 text-xs py-2">
                  ... and {run.events.length - 100} more events
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const LabEventEntry = ({ event, index }: { event: RunEvent; index: number }) => {
  const typeConfig = {
    'scenario:start': { bg: 'bg-blue-900/30', text: 'text-blue-400', label: 'Start' },
    'scenario:end': { bg: 'bg-green-900/30', text: 'text-green-400', label: 'End' },
    'agent:spawn': { bg: 'bg-purple-900/30', text: 'text-purple-400', label: 'Spawn' },
    'agent:action': { bg: 'bg-cyan-900/30', text: 'text-cyan-400', label: 'Action' },
    'event:scheduled': { bg: 'bg-yellow-900/30', text: 'text-yellow-400', label: 'Scheduled' },
    'event:executed': { bg: 'bg-emerald-900/30', text: 'text-emerald-400', label: 'Executed' },
    'match:found': { bg: 'bg-indigo-900/30', text: 'text-indigo-400', label: 'Match' },
    'error': { bg: 'bg-red-900/30', text: 'text-red-400', label: 'Error' },
  }[event.type];

  return (
    <div className={cn('px-2 py-1 rounded text-xs font-mono flex items-center gap-2', typeConfig.bg, typeConfig.text)}>
      <span className="text-gray-500 w-16">{new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 })}</span>
      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-medium bg-black/30">{typeConfig.label}</span>
      {event.data.agentName && <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/30">{event.data.agentName}</span>}
      {event.type === 'match:found' && event.data.score && <span className="text-yellow-400">Score: {Number(event.data.score).toFixed(2)}</span>}
    </div>
  );
};

const HistogramCard = ({ title, data, bins, color }: { title: string; data: number[]; bins: number; color: string }) => {
  if (data.length === 0) {
    return (
      <Card variant="outlined" className="p-4">
        <h5 className="font-medium mb-2">{title}</h5>
        <p className="text-gray-500 text-sm">No data</p>
      </Card>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const binSize = range / bins;

  const histogram: HistogramBin[] = Array.from({ length: bins }, (_, i) => {
    const binMin = min + i * binSize;
    const binMax = min + (i + 1) * binSize;
    const count = data.filter(v => v >= binMin && (i === bins - 1 ? v <= binMax : v < binMax)).length;
    return {
      range: `${binMin.toFixed(1)}–${binMax.toFixed(1)}`,
      count,
      percentage: (count / data.length) * 100,
    };
  });

  const maxCount = Math.max(...histogram.map(h => h.count));

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
  };

  return (
    <Card variant="outlined" className="p-4">
      <h5 className="font-medium mb-3">{title}</h5>
      <div className="space-y-1">
        {histogram.map((bin, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-24 font-mono">{bin.range}</span>
            <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
              <div
                className={cn('h-full rounded', colorMap[color] || 'bg-indigo-500')}
                style={{ width: `${maxCount > 0 ? (bin.count / maxCount) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs font-mono text-gray-400 w-16 text-right">{bin.count} ({bin.percentage.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const MetricCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) => {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-900/30 border-indigo-500/30 text-indigo-400',
    emerald: 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400',
    yellow: 'bg-yellow-900/30 border-yellow-500/30 text-yellow-400',
    red: 'bg-red-900/30 border-red-500/30 text-red-400',
    purple: 'bg-purple-900/30 border-purple-500/30 text-purple-400',
  };

  return (
    <div className={cn('p-3 rounded-lg border text-center', colorMap[color] || colorMap.indigo)}>
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className="flex items-center justify-center gap-1">
        <span className="font-mono text-lg">{value}</span>
        {icon}
      </div>
    </div>
  );
};

const LabHistoryPanel = ({ history, onLoad, onDelete }: {
  history: LabRunResult[];
  onLoad: (run: LabRunResult) => void;
  onDelete: (id: string) => void;
}) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Database size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg">No runs yet</p>
        <p className="text-sm mt-1">Run an experiment to see history</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map(run => (
        <LabHistoryEntry key={run.id} run={run} onLoad={onLoad} onDelete={onDelete} />
      ))}
    </div>
  );
};

const LabHistoryEntry = ({ run, onLoad, onDelete }: { run: LabRunResult; onLoad: (run: LabRunResult) => void; onDelete: (id: string) => void }) => {
  const statusConfig = {
    running: { color: 'text-blue-400', bg: 'bg-blue-900/30', icon: <Zap className="animate-spin" size={12} /> },
    completed: { color: 'text-green-400', bg: 'bg-green-900/30', icon: <Check size={12} /> },
    failed: { color: 'text-red-400', bg: 'bg-red-900/30', icon: <AlertCircle size={12} /> },
    cancelled: { color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: <X size={12} /> },
  }[run.status];

  return (
    <Card variant="outlined" className="p-3">
      <div className="flex items-center gap-3">
        <div className={cn('p-1.5 rounded', statusConfig.bg, statusConfig.color)}>
          {statusConfig.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{run.id}</span>
            <Badge variant="ghost" size="xs">{run.config.scenario}</Badge>
            <Badge variant="ghost" size="xs">×{run.config.repetitions}</Badge>
            {run.config.fastMode && <Badge variant="ghost" size="xs" className="text-blue-400">Fast</Badge>}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-4">
            <span>{new Date(run.startedAt).toLocaleString()}</span>
            {run.completedAt && <span>Completed: {new Date(run.completedAt).toLocaleString()}</span>}
            {run.status === 'completed' && (
              <>
                <span className="text-indigo-400">Matches: {run.metrics.totalMatches}</span>
                <span className="text-emerald-400">Avg Score: {run.metrics.avgMatchScore.toFixed(2)}</span>
              </>
            )}
            {run.error && <span className="text-red-400">Error: {run.error}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconButton size="sm" onClick={() => onLoad(run)} aria-label="Load config" icon={<FileText size={14} />} />
          <IconButton size="sm" onClick={() => onDelete(run.id)} aria-label="Delete" icon={<Trash2 size={14} />} className="text-red-400 hover:bg-red-900/30" />
        </div>
      </div>
    </Card>
  );
};

const LabExportPanel = ({ run, history }: { run: LabRunResult | null; history: LabRunResult[] }) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);

  const content = useMemo(() => {
    if (format === 'markdown') {
      return generateMarkdown(run, history);
    }
    return generateJSON(run, history);
  }, [run, history, format]);

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
    a.download = `lab-results-${Date.now()}.${format === 'markdown' ? 'md' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4 flex-1 flex flex-col">
      <div className="flex items-center gap-4">
        <Select value={format} onChange={(e) => setFormat(e.target.value as 'markdown' | 'json')} options={[
          { value: 'markdown', label: 'Markdown' },
          { value: 'json', label: 'JSON' },
        ]} className="w-48" />
        <Button variant="secondary" onClick={handleCopy} icon={copied ? <Check size={16} /> : <DownloadIcon size={16} />}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <Button variant="secondary" onClick={handleDownload} icon={<DownloadIcon size={16} />}>
          Download
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="bg-gray-950 p-4 rounded font-mono text-xs text-gray-300 whitespace-pre-wrap">{content}</pre>
      </div>
    </div>
  );
};

function generateMarkdown(run: LabRunResult | null, history: LabRunResult[]): string {
  if (!run) return '# Lab Results\n\nNo run data available.';

  return `# Lab Experiment Results

## Run: ${run.id}
- **Scenario**: ${run.config.scenario}
- **Repetitions**: ${run.config.repetitions}
- **Fast Mode**: ${run.config.fastMode ? 'Yes' : 'No'}
- **Seed**: ${run.config.seed}
- **Status**: ${run.status}
- **Started**: ${run.startedAt}
- **Completed**: ${run.completedAt || 'N/A'}

## Configuration
### Ontology Patch
\`\`\`json
${run.config.ontologyPatch || '{}'}
\`\`\`

### Param Patches
\`\`\`json
${run.config.paramPatches}
\`\`\`

## Metrics
| Metric | Value |
|--------|-------|
| Total Matches | ${run.metrics.totalMatches} |
| Matches/Minute | ${run.metrics.matchesPerMinute.toFixed(2)} |
| Avg Match Score | ${run.metrics.avgMatchScore.toFixed(3)} |
| Unmatched Rate | ${(run.metrics.unmatchedRate * 100).toFixed(1)}% |
| Time to First Match | ${run.metrics.timeToFirstMatch.toFixed(0)}ms |

## Per-Agent Matches
${Object.entries(run.metrics.perAgentMatches).map(([agent, count]) => `- ${agent}: ${count}`).join('\n') || 'None'}

## Per-Domain Matches
${Object.entries(run.metrics.perDomainMatches).map(([domain, count]) => `- ${domain}: ${count}`).join('\n') || 'None'}

## Match Score Distribution
${run.metrics.matchScoreDistribution.length > 0
  ? run.metrics.matchScoreDistribution.map((s, i) => `${i}: ${s.toFixed(3)}`).join(', ')
  : 'No matches'}

## History Summary
${history.map(h => `- ${h.id}: ${h.config.scenario} ×${h.config.repetitions} = ${h.metrics.totalMatches} matches (${h.status})`).join('\n')}

---
*Generated by Notention Developer Lab*
`;
}

function generateJSON(run: LabRunResult | null, history: LabRunResult[]): string {
  return JSON.stringify({
    currentRun: run,
    history,
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

const LabRunDetailModal = ({ run, onClose }: { run: LabRunResult; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl border max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">{run.id}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}><X size={20} /></Button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Scenario: </span><span className="font-mono">{run.config.scenario}</span></div>
            <div><span className="text-gray-500">Repetitions: </span><span>{run.config.repetitions}</span></div>
            <div><span className="text-gray-500">Fast Mode: </span><span>{run.config.fastMode ? 'Yes' : 'No'}</span></div>
            <div><span className="text-gray-500">Seed: </span><span className="font-mono">{run.config.seed}</span></div>
            <div><span className="text-gray-500">Status: </span><span>{run.status}</span></div>
            <div><span className="text-gray-500">Started: </span><span>{new Date(run.startedAt).toLocaleString()}</span></div>
          </div>
          {run.completedAt && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-2 bg-gray-950 rounded"><div className="text-gray-500">Total Matches</div><div className="font-mono text-lg">{run.metrics.totalMatches}</div></div>
              <div className="p-2 bg-gray-950 rounded"><div className="text-gray-500">Avg Score</div><div className="font-mono text-lg">{run.metrics.avgMatchScore.toFixed(3)}</div></div>
              <div className="p-2 bg-gray-950 rounded"><div className="text-gray-500">Unmatched %</div><div className="font-mono text-lg">{(run.metrics.unmatchedRate * 100).toFixed(1)}%</div></div>
            </div>
          )}
          <div className="bg-gray-950 p-3 rounded font-mono text-xs overflow-auto max-h-64">
            {run.config.ontologyPatch && (
              <div className="mb-2">
                <div className="text-gray-500">Ontology Patch:</div>
                {run.config.ontologyPatch}
              </div>
            )}
            {run.config.paramPatches && (
              <div>
                <div className="text-gray-500">Param Patches:</div>
                {run.config.paramPatches}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
async function runHeadlessScenario(scenarioName: string, config: LabRunConfig, seed: number): Promise<RunEvent[]> {
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioName,
      agentCount: 8,
      duration: 30,
      ontologyPatch: config.ontologyPatch ? JSON.parse(config.ontologyPatch) : undefined,
      paramPatches: config.paramPatches ? JSON.parse(config.paramPatches) : undefined,
      seed,
      fastMode: config.fastMode,
    }),
  });

  if (!response.ok) throw new Error('Failed to start job');

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

function computeMetrics(events: RunEvent[]): LabMetrics {
  const matchEvents = events.filter(e => e.type === 'match:found');
  const agentSpawns = events.filter(e => e.type === 'agent:spawn');
  const scenarioStart = events.find(e => e.type === 'scenario:start');
  const scenarioEnd = events.find(e => e.type === 'scenario:end');

  const perAgentMatches: Record<string, number> = {};
  const perDomainMatches: Record<string, number> = {};
  const matchScoreDistribution: number[] = [];
  let totalScore = 0;

  for (const event of matchEvents) {
    const agentName = event.data.agentName as string | undefined;
    if (agentName) {
      perAgentMatches[agentName] = (perAgentMatches[agentName] || 0) + 1;
    }
    const score = Number(event.data.score) || 0;
    totalScore += score;
    matchScoreDistribution.push(score);

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
  const unmatchedRate = Math.max(0, 1 - matchEvents.length / Math.max(1, agentSpawns.length));

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
    matchScoreDistribution,
  };
}

export default LabView;