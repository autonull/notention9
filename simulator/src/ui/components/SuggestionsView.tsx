import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Zap, AlertCircle, CheckCircle, XCircle, FileText, GitBranch, Brain, Eye, Check, X, ChevronDown, ChevronUp, Download, Settings, Trash2, Clock, TrendingUp, TrendingDown, MinusCircle, RotateCcw } from 'lucide-react';
import { Button, IconButton, Input, Select, Card, CardHeader, CardContent, Badge, Tabs, TabList, Tab, TabPanels, TabPanel, Modal, ConfirmModal, Textarea } from '../components/ui';
import { DesignTokens } from '../components/ui';
import { cn, formatDuration } from '../utils';
import { useToast } from '../components/ui';

export interface Suggestion {
  id: string;
  source: 'simulator' | 'friction' | 'optimizer' | 'prompt';
  evidenceClass: 'measured' | 'hypothesized' | 'observed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'proposed' | 'reviewed' | 'approved' | 'revision' | 'rejected' | 'implemented';
  title: string;
  description: string;
  evidence: string;
  proposedChange: ProposedChange;
  simulatedResult?: SimulatedResult;
  frictionData?: FrictionData;
  optimizerData?: OptimizerData;
  promptData?: PromptData;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface ProposedChange {
  type: 'ontology' | 'param' | 'prompt' | 'strategy';
  target: string;
  patch: Record<string, unknown>;
  description: string;
}

export interface SimulatedResult {
  metric: string;
  baseline: number;
  variant: number;
  delta: number;
  pValue: number;
  powered: boolean;
  evidenceClass: 'measured' | 'hypothesized' | 'observed';
}

export interface FrictionData {
  kinds: string[];
  counts: Record<string, number>;
  halfLifeWeightedCount: number;
  timeWindow: string;
}

export interface OptimizerData {
  cycleId: string;
  verdict: string;
  n: number;
  repetitions: number;
  mde: number;
  candidateId: string;
}

export interface PromptData {
  promptId: string;
  version: string;
  previousVersion: string;
  diff: string;
}

const SEVERITY_COLORS = {
  low: { bg: 'bg-gray-900/30', text: 'text-gray-400', border: 'border-gray-600' },
  medium: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-600' },
  high: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-600' },
  critical: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-600' },
};

const STATUS_COLORS = {
  proposed: { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: <Clock size={12} /> },
  reviewed: { bg: 'bg-purple-900/30', text: 'text-purple-400', icon: <Eye size={12} /> },
  approved: { bg: 'bg-green-900/30', text: 'text-green-400', icon: <CheckCircle size={12} /> },
  revision: { bg: 'bg-indigo-900/30', text: 'text-indigo-400', icon: <GitBranch size={12} /> },
  rejected: { bg: 'bg-red-900/30', text: 'text-red-400', icon: <XCircle size={12} /> },
  implemented: { bg: 'bg-emerald-900/30', text: 'text-emerald-400', icon: <CheckCircle size={12} /> },
};

const SOURCE_ICONS = {
  simulator: <Zap size={14} />,
  friction: <TrendingDown size={14} />,
  optimizer: <Brain size={14} />,
  prompt: <FileText size={14} />,
};

const SOURCE_LABELS = {
  simulator: 'Simulator Metrics',
  friction: 'Friction Journal',
  optimizer: 'Optimizer Winner',
  prompt: 'Prompt Update',
};

const EVIDENCE_CLASS_LABELS = {
  measured: 'Measured (Direct)',
  hypothesized: 'Hypothesized (Simulated)',
  observed: 'Observed (Journal)',
};

const EVIDENCE_CLASS_COLORS = {
  measured: 'text-green-400',
  hypothesized: 'text-yellow-400',
  observed: 'text-blue-400',
};

export const SuggestionsView = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Suggestion['status']>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | Suggestion['source']>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | Suggestion['severity']>('all');
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [showCreateRevision, setShowCreateRevision] = useState(false);
  const [revisionConfig, setRevisionConfig] = useState<{ strategyId: string; params: Record<string, unknown> }>({ strategyId: '', params: {} });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      // Load from multiple sources
      const [simulatorSuggestions, frictionSuggestions, optimizerSuggestions] = await Promise.all([
        loadSimulatorSuggestions(),
        loadFrictionSuggestions(),
        loadOptimizerSuggestions(),
      ]);
      setSuggestions([...simulatorSuggestions, ...frictionSuggestions, ...optimizerSuggestions].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (e) {
      console.error('Failed to load suggestions:', e);
      addToast('Failed to load suggestions', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && s.source !== sourceFilter) return false;
      if (severityFilter !== 'all' && s.severity !== severityFilter) return false;
      return true;
    });
  }, [suggestions, statusFilter, sourceFilter, severityFilter]);

  const handleStatusChange = (id: string, status: Suggestion['status']) => {
    setSuggestions(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, status, updatedAt: new Date().toISOString() };
      if (status === 'reviewed') updated.reviewedAt = new Date().toISOString();
      if (status === 'rejected') updated.rejectionReason = rejectReason;
      return updated;
    }));
    if (status === 'rejected') setShowRejectModal(false);
    addToast(`Suggestion ${status}`, 'info');
  };

  const handleCreateRevision = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setRevisionConfig({
      strategyId: suggestion.proposedChange.target,
      params: suggestion.proposedChange.patch,
    });
    setShowCreateRevision(true);
  };

  const handleConfirmRevision = async () => {
    if (!selectedSuggestion) return;
    try {
      // In a real implementation, this would call the revision API
      // For now, we'll just update the status
      setSuggestions(prev => prev.map(s =>
        s.id === selectedSuggestion.id ? { ...s, status: 'revision' as const, updatedAt: new Date().toISOString() } : s
      ));
      addToast('Revision created successfully', 'success');
      setShowCreateRevision(false);
      setSelectedSuggestion(null);
    } catch (e) {
      addToast('Failed to create revision', 'error');
    }
  };

  const handleReject = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (selectedSuggestion) {
      handleStatusChange(selectedSuggestion.id, 'rejected');
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <Card variant="elevated" className={cn(DesignTokens.shadows.card, DesignTokens.card.elevated)}>
        <CardHeader className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-xl font-bold">Suggestions Queue</h2>
            <Badge variant="secondary" size="sm">{filteredSuggestions.length} of {suggestions.length}</Badge>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Suggestions from simulator metrics, friction journal, and optimizer. Each labeled with evidence class.
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'proposed', label: 'Proposed' },
                { value: 'reviewed', label: 'Reviewed' },
                { value: 'approved', label: 'Approved' },
                { value: 'revision', label: 'Revision Created' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'implemented', label: 'Implemented' },
              ]}
              className="w-40"
              size="sm"
              placeholder="Status"
            />
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
              options={[
                { value: 'all', label: 'All Sources' },
                { value: 'simulator', label: 'Simulator' },
                { value: 'friction', label: 'Friction' },
                { value: 'optimizer', label: 'Optimizer' },
                { value: 'prompt', label: 'Prompt' },
              ]}
              className="w-40"
              size="sm"
              placeholder="Source"
            />
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
              options={[
                { value: 'all', label: 'All Severities' },
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
              className="w-40"
              size="sm"
              placeholder="Severity"
            />
            <Button variant="ghost" size="sm" onClick={loadSuggestions} icon={<RotateCcw size={14} />}>
              Refresh
            </Button>
          </div>

          {/* Suggestions List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <SuggestionSkeleton key={i} />)}
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="text-gray-500 text-center py-12">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No suggestions match your filters.</p>
              <p className="text-sm mt-1">Run simulations, check friction journal, or run optimizer to generate suggestions.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-auto">
              {filteredSuggestions.map(suggestion => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onStatusChange={handleStatusChange}
                  onCreateRevision={handleCreateRevision}
                  onReject={handleReject}
                  onViewDetails={() => setSelectedSuggestion(suggestion)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedSuggestion && (
        <SuggestionDetailModal
          suggestion={selectedSuggestion}
          onClose={() => setSelectedSuggestion(null)}
          onCreateRevision={handleCreateRevision}
          onReject={handleReject}
        />
      )}

      {/* Create Revision Modal */}
      <Modal
        isOpen={showCreateRevision}
        onClose={() => { setShowCreateRevision(false); setSelectedSuggestion(null); }}
        title="Create Revision from Suggestion"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-300">This will create a revision with the proposed changes. The revision will appear in the Revisions tab for consent.</p>
          <div>
            <label className="block text-sm font-medium mb-1">Strategy ID</label>
            <Input
              value={revisionConfig.strategyId}
              onChange={(e) => setRevisionConfig({ ...revisionConfig, strategyId: e.target.value })}
              placeholder="e.g., templateSelector"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Parameters (JSON)</label>
            <Textarea
              value={JSON.stringify(revisionConfig.params, null, 2)}
              onChange={(e) => {
                try {
                  setRevisionConfig({ ...revisionConfig, params: JSON.parse(e.target.value) });
                } catch {}
              }}
              rows={6}
              className="font-mono text-xs"
              placeholder='{ "param1": "value1" }'
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => { setShowCreateRevision(false); setSelectedSuggestion(null); }}>Cancel</Button>
            <Button onClick={handleConfirmRevision}>Create Revision</Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <ConfirmModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleConfirmReject}
        title="Reject Suggestion"
        message="Please provide a reason for rejecting this suggestion. This will be recorded in the ledger."
        confirmLabel="Reject"
        variant="danger"
      >
        <Textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection..."
          rows={3}
          className="mb-4"
        />
      </ConfirmModal>
    </div>
  );
};

const SuggestionCard = ({ suggestion, onStatusChange, onCreateRevision, onReject, onViewDetails }: {
  suggestion: Suggestion;
  onStatusChange: (id: string, status: Suggestion['status']) => void;
  onCreateRevision: (suggestion: Suggestion) => void;
  onReject: (suggestion: Suggestion) => void;
  onViewDetails: () => void;
}) => {
  const severityConfig = SEVERITY_COLORS[suggestion.severity];
  const statusConfig = STATUS_COLORS[suggestion.status];
  const sourceIcon = SOURCE_ICONS[suggestion.source];
  const evidenceClassColor = EVIDENCE_CLASS_COLORS[suggestion.evidenceClass];

  return (
    <Card variant="outlined" className={cn('p-4 transition-colors', severityConfig.border, 'border-l-4')}>
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg flex-shrink-0', severityConfig.bg, severityConfig.text)}>
          {sourceIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-medium truncate">{suggestion.title}</h4>
            <Badge variant="default" size="xs" className={cn(statusConfig.bg, statusConfig.text)}>
              {statusConfig.icon}
              {suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}
            </Badge>
            <Badge variant="ghost" size="xs" className={evidenceClassColor}>
              {EVIDENCE_CLASS_LABELS[suggestion.evidenceClass]}
            </Badge>
            <Badge variant="ghost" size="xs">{SOURCE_LABELS[suggestion.source]}</Badge>
            <Badge variant="ghost" size="xs" className={severityConfig.text}>
              {suggestion.severity.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mb-2 line-clamp-2">{suggestion.description}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Created: {new Date(suggestion.createdAt).toLocaleString()}</span>
            {suggestion.simulatedResult && (
              <span className="flex items-center gap-1">
                <TrendingUp size={12} className={suggestion.simulatedResult.delta > 0 ? 'text-green-400' : 'text-red-400'} />
                Delta: {(suggestion.simulatedResult.delta * 100).toFixed(1)}%
                {suggestion.simulatedResult.powered ? <span className="text-green-400">●</span> : <span className="text-yellow-400">○</span>}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onViewDetails} icon={<Eye size={14} />} aria-label="View details" />
          {suggestion.status === 'proposed' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onStatusChange(suggestion.id, 'reviewed')} icon={<Check size={14} />} aria-label="Mark reviewed" />
              <Button variant="secondary" size="sm" onClick={() => onCreateRevision(suggestion)} icon={<GitBranch size={14} />}>
                Create Revision
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onReject(suggestion)} icon={<X size={14} />} aria-label="Reject" className="text-red-400 hover:bg-red-900/30" />
            </>
          )}
          {suggestion.status === 'reviewed' && (
            <>
              <Button variant="secondary" size="sm" onClick={() => onCreateRevision(suggestion)} icon={<GitBranch size={14} />}>
                Create Revision
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onReject(suggestion)} icon={<X size={14} />} aria-label="Reject" className="text-red-400 hover:bg-red-900/30" />
            </>
          )}
          {suggestion.status === 'approved' && (
            <Button variant="primary" size="sm" onClick={() => onCreateRevision(suggestion)} icon={<GitBranch size={14} />}>
              Create Revision
            </Button>
          )}
          {suggestion.status === 'rejected' && suggestion.rejectionReason && (
            <Button variant="ghost" size="sm" onClick={onViewDetails} icon={<FileText size={14} />} aria-label="View rejection reason" className="text-gray-500" />
          )}
        </div>
      </div>
    </Card>
  );
};

const SuggestionSkeleton = () => (
  <Card variant="outlined" className="p-4 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-gray-800" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-3/4 bg-gray-800 rounded" />
        <div className="h-4 w-1/2 bg-gray-800 rounded" />
        <div className="h-4 w-1/3 bg-gray-800 rounded" />
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-gray-800 rounded" />
          <div className="h-5 w-20 bg-gray-800 rounded" />
          <div className="h-5 w-20 bg-gray-800 rounded" />
        </div>
      </div>
    </div>
  </Card>
);

const SuggestionDetailModal = ({ suggestion, onClose, onCreateRevision, onReject }: {
  suggestion: Suggestion;
  onClose: () => void;
  onCreateRevision: (suggestion: Suggestion) => void;
  onReject: (suggestion: Suggestion) => void;
}) => {
  const severityConfig = SEVERITY_COLORS[suggestion.severity];
  const statusConfig = STATUS_COLORS[suggestion.status];
  const sourceIcon = SOURCE_ICONS[suggestion.source];
  const evidenceClassColor = EVIDENCE_CLASS_COLORS[suggestion.evidenceClass];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl border max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', severityConfig.bg, severityConfig.text)}>
              {sourceIcon}
            </div>
            <div>
              <h3 className="font-bold">{suggestion.title}</h3>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="default" className={cn(statusConfig.bg, statusConfig.text)}>
                  {statusConfig.icon}
                  {suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}
                </Badge>
                <Badge variant="ghost" className={evidenceClassColor}>
                  {EVIDENCE_CLASS_LABELS[suggestion.evidenceClass]}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><XCircle size={20} /></Button>
        </div>

        <div className="p-4 space-y-6">
          {/* Description */}
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-gray-300">{suggestion.description}</p>
          </div>

          {/* Evidence */}
          <div className="bg-gray-950 p-4 rounded-lg border">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileText size={16} />
              Evidence
            </h4>
            <p className="text-gray-300 text-sm mb-3">{suggestion.evidence}</p>
            {suggestion.simulatedResult && (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-2 bg-gray-900 rounded">
                  <div className="text-gray-500">Baseline</div>
                  <div className="font-mono">{suggestion.simulatedResult.baseline.toFixed(3)}</div>
                </div>
                <div className="p-2 bg-gray-900 rounded">
                  <div className="text-gray-500">Variant</div>
                  <div className="font-mono">{suggestion.simulatedResult.variant.toFixed(3)}</div>
                </div>
                <div className="p-2 bg-gray-900 rounded">
                  <div className="text-gray-500">Delta</div>
                  <div className={cn('font-mono', suggestion.simulatedResult.delta > 0 ? 'text-green-400' : 'text-red-400')}>
                    {(suggestion.simulatedResult.delta * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
              <span>p-value: {suggestion.simulatedResult?.pValue?.toFixed(4) || 'N/A'}</span>
              <span className={suggestion.simulatedResult?.powered ? 'text-green-400' : 'text-yellow-400'}>
                {suggestion.simulatedResult?.powered ? 'Powered' : 'Underpowered'}
              </span>
            </div>
          </div>

          {/* Proposed Change */}
          <div className="bg-gray-950 p-4 rounded-lg border">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Settings size={16} />
              Proposed Change ({suggestion.proposedChange.type})
            </h4>
            <div className="text-sm text-gray-300 mb-2">{suggestion.proposedChange.description}</div>
            <div className="font-mono text-xs bg-gray-900 p-3 rounded overflow-auto">
              {JSON.stringify(suggestion.proposedChange.patch, null, 2)}
            </div>
          </div>

          {/* Source-specific data */}
          {suggestion.frictionData && (
            <div className="bg-gray-950 p-4 rounded-lg border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <TrendingDown size={16} />
                Friction Data
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Kinds: </span><span>{suggestion.frictionData.kinds.join(', ')}</span></div>
                <div><span className="text-gray-500">Weighted Count: </span><span className="font-mono">{suggestion.frictionData.halfLifeWeightedCount.toFixed(1)}</span></div>
                <div className="col-span-2"><span className="text-gray-500">Time Window: </span><span>{suggestion.frictionData.timeWindow}</span></div>
                <div className="col-span-2">
                  <span className="text-gray-500">Counts: </span>
                  <pre className="font-mono text-xs mt-1">{JSON.stringify(suggestion.frictionData.counts, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

          {suggestion.optimizerData && (
            <div className="bg-gray-950 p-4 rounded-lg border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Brain size={16} />
                Optimizer Data
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Cycle ID: </span><span className="font-mono">{suggestion.optimizerData.cycleId}</span></div>
                <div><span className="text-gray-500">Verdict: </span><span>{suggestion.optimizerData.verdict}</span></div>
                <div><span className="text-gray-500">n: </span><span>{suggestion.optimizerData.n}</span></div>
                <div><span className="text-gray-500">Repetitions: </span><span>{suggestion.optimizerData.repetitions}</span></div>
                <div><span className="text-gray-500">MDE: </span><span>{(suggestion.optimizerData.mde * 100).toFixed(1)}%</span></div>
                <div><span className="text-gray-500">Candidate ID: </span><span className="font-mono">{suggestion.optimizerData.candidateId}</span></div>
              </div>
            </div>
          )}

          {suggestion.promptData && (
            <div className="bg-gray-950 p-4 rounded-lg border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText size={16} />
                Prompt Data
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Prompt ID: </span><span className="font-mono">{suggestion.promptData.promptId}</span></div>
                <div><span className="text-gray-500">Version: </span><span>{suggestion.promptData.version}</span></div>
                <div className="col-span-2"><span className="text-gray-500">Diff: </span></div>
                <div className="col-span-2">
                  <pre className="font-mono text-xs bg-gray-900 p-2 rounded overflow-auto max-h-40">{suggestion.promptData.diff}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            {suggestion.status === 'proposed' && (
              <>
                <Button variant="secondary" onClick={() => { onStatusChange(suggestion.id, 'reviewed'); onClose(); }}>
                  <Check size={14} className="mr-2" /> Mark Reviewed
                </Button>
                <Button onClick={() => { onCreateRevision(suggestion); onClose(); }}>
                  <GitBranch size={14} className="mr-2" /> Create Revision
                </Button>
                <Button variant="danger" onClick={() => onReject(suggestion)}>
                  <XCircle size={14} className="mr-2" /> Reject
                </Button>
              </>
            )}
            {suggestion.status === 'reviewed' && (
              <>
                <Button onClick={() => { onCreateRevision(suggestion); onClose(); }}>
                  <GitBranch size={14} className="mr-2" /> Create Revision
                </Button>
                <Button variant="danger" onClick={() => onReject(suggestion)}>
                  <XCircle size={14} className="mr-2" /> Reject
                </Button>
              </>
            )}
            {suggestion.status === 'approved' && (
              <Button onClick={() => { onCreateRevision(suggestion); onClose(); }}>
                <GitBranch size={14} className="mr-2" /> Create Revision
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Data loading functions (mock implementations - replace with real API calls)
async function loadSimulatorSuggestions(): Promise<Suggestion[]> {
  // In real implementation, fetch from simulator metrics API
  return [];
}

async function loadFrictionSuggestions(): Promise<Suggestion[]> {
  // In real implementation, fetch from friction journal API
  return [];
}

async function loadOptimizerSuggestions(): Promise<Suggestion[]> {
  // In real implementation, fetch from optimizer results
  return [];
}

// Add missing import
export default SuggestionsView;