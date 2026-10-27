import React, { useMemo, useCallback } from 'react';
import { Play, Loader2, Info, HelpCircle, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScenarios, useScenarioDetails, SCENARIO_DETAILS } from '../hooks/useScenarios';
import { useToast } from '../components/ui';
import { Button, Input, Kbd, Skeleton } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui';
import { Badge } from '../components/ui';
import { DesignTokens } from '../components/ui';
import { cn, clamp } from '../utils';

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
      className={cn(
        'relative p-4 rounded-xl border-2 flex flex-col gap-3',
        DesignTokens.colors.state.transition,
        isSelected
          ? 'border-indigo-500 bg-indigo-900/30 shadow-lg shadow-indigo-500/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-700/50'
      )}
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

const ValidationMessage = ({ message, type = 'error' }: { message: string; type?: 'error' | 'warning' | 'info' }) => {
  const typeStyles = {
    error: cn(DesignTokens.colors.status.error.bg, DesignTokens.colors.status.error.border),
    warning: cn(DesignTokens.colors.status.warning.bg, DesignTokens.colors.status.warning.border),
    info: cn(DesignTokens.colors.status.connecting.bg, DesignTokens.colors.status.connecting.border),
  };
  const icons = {
    error: <AlertTriangle size={16} />,
    warning: <Info size={16} />,
    info: <HelpCircle size={16} />,
  };

  return (
    <div className={cn('flex items-center gap-2 p-3 rounded-lg text-sm', typeStyles[type])} role="alert">
      {icons[type]}
      <span>{message}</span>
    </div>
  );
};

interface ScenarioSelectorProps {
  scenarios: string[];
  scenariosLoading: boolean;
  selectedScenario: string;
  onSelect: (scenario: string) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

export const ScenarioSelector = ({ scenarios, scenariosLoading, selectedScenario, onSelect, showAdvanced, onToggleAdvanced }: ScenarioSelectorProps) => {
  if (scenariosLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle id="scenario-heading">Scenario</CardTitle>
            <CardDescription>Choose a scenario to simulate</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleAdvanced}
            icon={showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            iconPosition="right"
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? 'Show Less' : 'Show Details'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="radiogroup" aria-label="Select scenario">
          {scenarios.map((s) => {
            const info = SCENARIO_DETAILS[s] || { id: s, name: s, description: 'Custom scenario', tags: [] };
            return (
              <ScenarioCard
                key={s}
                scenario={info}
                isSelected={selectedScenario === s}
                onClick={() => onSelect(s)}
                loading={scenariosLoading}
              />
            );
          })}
        </div>

        {showAdvanced && (
          <ScenarioDetailsPanel selectedScenario={selectedScenario} />
        )}
      </CardContent>
    </>
  );
};

interface ScenarioDetailsPanelProps {
  selectedScenario: string;
}

const ScenarioDetailsPanel = ({ selectedScenario }: ScenarioDetailsPanelProps) => {
  const info = useScenarioDetails(selectedScenario);

  return (
    <div className={cn('mt-4 p-4 rounded-xl border animate-slide-in-down', DesignTokens.colors.background.panel, DesignTokens.colors.border.panel)}>
      <div className="flex items-center gap-2 mb-3">
        <Info size={16} className="text-indigo-400" />
        <span className="font-medium text-gray-300">{info.name} Details</span>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className={DesignTokens.colors.text.muted}>Description</dt>
          <dd className={cn(DesignTokens.colors.text.secondary, 'mt-1')}>{info.description}</dd>
        </div>
        {info.agentCount && (
          <div>
            <dt className={DesignTokens.colors.text.muted}>Default Agents</dt>
            <dd className={cn(DesignTokens.colors.text.secondary, 'mt-1')}>{info.agentCount}</dd>
          </div>
        )}
        {info.duration && (
          <div>
            <dt className={DesignTokens.colors.text.muted}>Default Duration</dt>
            <dd className={cn(DesignTokens.colors.text.secondary, 'mt-1')}>{info.duration}s</dd>
          </div>
        )}
        <div className="col-span-2">
          <dt className={DesignTokens.colors.text.muted}>Tags</dt>
          <dd className="flex flex-wrap gap-1.5 mt-1">
            {info.tags.map((tag) => (
              <Badge key={tag} variant="default" size="sm">
                {tag}
              </Badge>
            ))}
          </dd>
        </div>
      </dl>
    </div>
  );
};

interface ParametersFormProps {
  agentCount: number;
  duration: number;
  validation: { valid: boolean; message: string; type: 'error' | 'warning' | 'info' };
  onAgentCountChange: (value: string) => void;
  onDurationChange: (value: string) => void;
}

export const ParametersForm = ({ agentCount, duration, validation, onAgentCountChange, onDurationChange }: ParametersFormProps) => (
  <section aria-labelledby="params-heading" className={DesignTokens.animations.slideInUp}>
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
        onChange={(e) => onAgentCountChange(e.target.value)}
        onBlur={(e) => onAgentCountChange(e.target.value)}
        min={2}
        max={20}
        hint="2–20 agents (default: 5)"
        error={agentCount < 2 || agentCount > 20 ? 'Must be between 2 and 20' : undefined}
      />
      <Input
        id="duration"
        label="Duration (seconds)"
        type="number"
        value={duration}
        onChange={(e) => onDurationChange(e.target.value)}
        onBlur={(e) => onDurationChange(e.target.value)}
        min={10}
        max={300}
        hint="10–300 seconds (default: 30)"
        error={duration < 10 || duration > 300 ? 'Must be between 10 and 300' : undefined}
      />
    </div>

    {!validation.valid && (
      <ValidationMessage message={validation.message} type={validation.type} />
    )}
  </section>
);

interface ActionBarProps {
  loading: boolean;
  scenariosLoading: boolean;
  validation: { valid: boolean };
  onStart: () => void;
  onBrowseLibrary: () => void;
}

export const ActionBar = ({ loading, scenariosLoading, validation, onStart, onBrowseLibrary }: ActionBarProps) => (
  <CardFooter>
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <Button
        onClick={onStart}
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
        onClick={onBrowseLibrary}
        className="flex-1 sm:w-auto"
      >
        Browse Library
      </Button>
    </div>

    <p className={cn(DesignTokens.typography.caption, DesignTokens.colors.text.muted, 'text-center hidden sm:block mt-4')}>
      Press <Kbd className="inline-flex">⌘Enter</Kbd> to start production
    </p>
  </CardFooter>
);

export { ValidationMessage };