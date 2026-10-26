import React, { useState, useMemo, useCallback } from 'react';
import { Play, Loader2, Info, HelpCircle, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScenarios, useScenarioDetails, SCENARIO_DETAILS } from '../hooks/useScenarios';
import { useToast } from '../components/ui';
import { Button, Input, Kbd, Skeleton } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui';
import { Badge } from '../components/ui';

const ScenarioCard = ({ scenario, isSelected, onClick, loading }: {
  scenario: { id: string; name: string; description: string; agentCount?: number; duration?: number; tags: string[] };
  isSelected: boolean;
  onClick: () => void;
  loading?: boolean;
}) => {
  if (loading) return <Skeleton className="h-24 w-full" />;

  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col gap-3
        ${isSelected
          ? 'border-indigo-500 bg-indigo-900/30 shadow-lg shadow-indigo-500/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-700/50'}
      `}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{scenario.name}</h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{scenario.description}</p>
        </div>
        {isSelected && <CheckCircle className="text-indigo-400 flex-shrink-0 mt-0.5" size={20} aria-hidden="true" />}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {scenario.tags.map((tag) => (
          <Badge key={tag} variant="default" size="sm">
            {tag}
          </Badge>
        ))}
      </div>
      {scenario.agentCount && scenario.duration && (
        <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-700">
          <span className="flex items-center gap-1">{scenario.agentCount} agents</span>
          <span className="flex items-center gap-1">{scenario.duration}s duration</span>
        </div>
      )}
    </button>
  );
};

const ValidationMessage = ({ message, type = 'error' }: { message: string; type?: 'error' | 'warning' | 'info' }) => (
  <div
    className={`
      flex items-center gap-2 p-3 rounded-lg text-sm
      ${type === 'error' ? 'bg-red-900/30 text-red-300 border border-red-500/30' :
        type === 'warning' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-500/30' :
        'bg-blue-900/30 text-blue-300 border border-blue-500/30'}
    `}
    role="alert"
  >
    {type === 'error' && <AlertTriangle size={16} />}
    {type === 'warning' && <Info size={16} />}
    {type === 'info' && <HelpCircle size={16} />}
    <span>{message}</span>
  </div>
);

export const Studio = () => {
  const { scenarios, loading: scenariosLoading, reload: loadScenarios } = useScenarios();
  const [selectedScenario, setSelectedScenario] = useState('gig-economy');
  const [agentCount, setAgentCount] = useState(5);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const selectedScenarioInfo = useScenarioDetails(selectedScenario);

  const validation = useMemo(() => {
    if (selectedScenario === 'generate') {
      if (agentCount < 2 || agentCount > 20) {
        return { valid: false, message: 'Agent count must be between 2 and 20', type: 'error' as const };
      }
      if (duration < 10 || duration > 300) {
        return { valid: false, message: 'Duration must be between 10 and 300 seconds', type: 'error' as const };
      }
    }
    return { valid: true, message: '', type: 'info' as const };
  }, [selectedScenario, agentCount, duration]);

  const startJob = useCallback(async () => {
    if (!validation.valid) {
      addToast(validation.message, validation.type);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioName: selectedScenario,
          agentCount: selectedScenario === 'generate' ? agentCount : undefined,
          duration: selectedScenario === 'generate' ? duration : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Production started!', 'success');
        navigate('/live');
      } else {
        addToast(data.error || 'Failed to start job', 'error');
      }
    } catch (e) {
      addToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }, [validation, selectedScenario, agentCount, duration, addToast, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      startJob();
    }
  };

  return (
    <div className="max-w-4xl mx-auto" onKeyDown={handleKeyDown}>
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Create New Movie</h2>
        <p className="text-gray-400 mt-1">Configure and launch a simulation production</p>
      </header>

      <Card variant="elevated" className="space-y-8">
        {/* Scenario Selection */}
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle id="scenario-heading">Scenario</CardTitle>
              <CardDescription>Choose a scenario to simulate</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              icon={showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              iconPosition="right"
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? 'Show Less' : 'Show Details'}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {scenariosLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="radiogroup" aria-label="Select scenario">
              {scenarios.map((s) => {
                const info = SCENARIO_DETAILS[s] || { id: s, name: s, description: 'Custom scenario', tags: [] };
                return (
                  <ScenarioCard
                    key={s}
                    scenario={info}
                    isSelected={selectedScenario === s}
                    onClick={() => setSelectedScenario(s)}
                    loading={scenariosLoading}
                  />
                );
              })}
            </div>
          )}

          {/* Scenario Details Panel */}
          {!scenariosLoading && showAdvanced && (
            <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 animate-slide-in-down">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-indigo-400" />
                <span className="font-medium text-gray-300">{selectedScenarioInfo.name} Details</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">Description</dt>
                  <dd className="text-gray-300 mt-1">{selectedScenarioInfo.description}</dd>
                </div>
                {selectedScenarioInfo.agentCount && (
                  <div>
                    <dt className="text-gray-500">Default Agents</dt>
                    <dd className="text-gray-300 mt-1">{selectedScenarioInfo.agentCount}</dd>
                  </div>
                )}
                {selectedScenarioInfo.duration && (
                  <div>
                    <dt className="text-gray-500">Default Duration</dt>
                    <dd className="text-gray-300 mt-1">{selectedScenarioInfo.duration}s</dd>
                  </div>
                )}
                <div className="col-span-2">
                  <dt className="text-gray-500">Tags</dt>
                  <dd className="flex flex-wrap gap-1.5 mt-1">
                    {selectedScenarioInfo.tags.map((tag) => (
                      <Badge key={tag} variant="default" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </CardContent>

        {/* Dynamic Parameters */}
        {selectedScenario === 'generate' && !scenariosLoading && (
          <section aria-labelledby="params-heading" className="animate-slide-in-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Info size={18} className="text-indigo-400" />
              </div>
              <CardTitle id="params-heading">Parameters</CardTitle>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                id="agentCount"
                label="Agent Count"
                type="number"
                value={agentCount}
                onChange={(e) => setAgentCount(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
                onBlur={(e) => setAgentCount(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
                min={2}
                max={20}
                hint="2–20 agents (default: 5)"
                error={selectedScenario === 'generate' && (agentCount < 2 || agentCount > 20) ? 'Must be between 2 and 20' : undefined}
              />
              <Input
                id="duration"
                label="Duration (seconds)"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Math.max(10, Math.min(300, parseInt(e.target.value) || 10)))}
                onBlur={(e) => setDuration(Math.max(10, Math.min(300, parseInt(e.target.value) || 10)))}
                min={10}
                max={300}
                hint="10–300 seconds (default: 30)"
                error={selectedScenario === 'generate' && (duration < 10 || duration > 300) ? 'Must be between 10 and 300' : undefined}
              />
            </div>

            {/* Validation Feedback */}
            {!validation.valid && (
              <ValidationMessage message={validation.message} type={validation.type} />
            )}
          </section>
        )}

        {/* Action Bar */}
        <CardFooter>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Button
              onClick={startJob}
              disabled={loading || scenariosLoading || !validation.valid}
              loading={loading}
              icon={<Play size={20} />}
              className="flex-1"
              aria-busy={loading}
            >
              Start Production
              <Kbd className="ml-auto hidden sm:inline-flex">⌘Enter</Kbd>
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate('/movies')}
              className="flex-1 sm:w-auto"
            >
              Browse Library
            </Button>
          </div>

          {/* Keyboard Hint */}
          <p className="text-xs text-gray-500 text-center hidden sm:block mt-4">
            Press <Kbd className="inline-flex">⌘Enter</Kbd> to start production
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Studio;