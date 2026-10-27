import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScenarios, useScenarioDetails } from '../hooks/useScenarios';
import { useToast } from '../components/ui';
import { Card } from '../components/ui';
import { DesignTokens } from '../components/ui';
import { cn, clamp } from '../utils';
import { ScenarioSelector, ParametersForm, ActionBar, ValidationMessage } from './StudioComponents';

export const Studio = () => {
  const { scenarios, loading: scenariosLoading, reload: loadScenarios } = useScenarios();
  const [selectedScenario, setSelectedScenario] = useState('gig-economy');
  const [agentCount, setAgentCount] = useState(5);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

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

  const handleAgentCountChange = useCallback((value: string) => {
    setAgentCount(clamp(parseInt(value) || 2, 2, 20));
  }, []);

  const handleDurationChange = useCallback((value: string) => {
    setDuration(clamp(parseInt(value) || 10, 10, 300));
  }, []);

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
        <h2 className={cn(DesignTokens.typography.heading1, 'tracking-tight')}>Create New Movie</h2>
        <p className={cn(DesignTokens.colors.text.muted, 'mt-1')}>Configure and launch a simulation production</p>
      </header>

      <Card variant="elevated" className="space-y-8">
        <ScenarioSelector
          scenarios={scenarios}
          scenariosLoading={scenariosLoading}
          selectedScenario={selectedScenario}
          onSelect={setSelectedScenario}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
        />

        {selectedScenario === 'generate' && !scenariosLoading && (
          <ParametersForm
            agentCount={agentCount}
            duration={duration}
            validation={validation}
            onAgentCountChange={handleAgentCountChange}
            onDurationChange={handleDurationChange}
          />
        )}

        <ActionBar
          loading={loading}
          scenariosLoading={scenariosLoading}
          validation={validation}
          onStart={startJob}
          onBrowseLibrary={() => navigate('/movies')}
        />
      </Card>
    </div>
  );
};

export default Studio;