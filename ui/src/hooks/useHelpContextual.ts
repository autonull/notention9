import { useEffect, useRef, useCallback, useState } from 'react';
import { helpEngine, type ContextualTrigger, type HelpAnalyticsEvent } from '@notention/core/help';
import { useHelp } from './useHelp';

interface ContextualTriggerState {
  trigger: ContextualTrigger;
  showCount: number;
  lastShown: number;
  dismissed: boolean;
}

export interface UseHelpContextualReturn {
  activeTriggers: ContextualTrigger[];
  dismissTrigger: (triggerId: string) => void;
  resetTrigger: (triggerId: string) => void;
  checkTriggers: () => void;
}

const IDLE_THRESHOLD_MS = 60000; // 1 minute
const ERROR_COOLDOWN_MS = 30000; // 30 seconds

export function useHelpContextual(): UseHelpContextualReturn {
  const { recordEvent, getProgress, settings } = useHelp();
  const [activeTriggers, setActiveTriggers] = useState<ContextualTrigger[]>([]);
  const triggerStatesRef = useRef<Map<string, ContextualTriggerState>>(new Map());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastActivityRef = useRef(Date.now());
  const errorCountRef = useRef(0);
  const lastErrorTimeRef = useRef(0);

  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    const interval = setInterval(checkTriggers, 5000);
    
    return () => {
      for (const event of events) {
        window.removeEventListener(event, handleActivity);
      }
      clearInterval(interval);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const checkTriggers = useCallback(() => {
    if (!settings.analyticsEnabled) return;
    
    const now = Date.now();
    const triggers = helpEngine.getAllTriggers?.() ?? [];
    
    for (const trigger of triggers) {
      if (!trigger.enabled) continue;
      
      const state = triggerStatesRef.current.get(trigger.id) ?? {
        trigger,
        showCount: 0,
        lastShown: 0,
        dismissed: false,
      };
      
      if (state.dismissed && trigger.maxShowsPerSession > 0 && state.showCount >= trigger.maxShowsPerSession) {
        continue;
      }
      
      if (now - state.lastShown < trigger.cooldownMs) {
        continue;
      }
      
      let shouldShow = false;
      
      switch (trigger.condition) {
        case 'idle': {
          const idleTime = now - lastActivityRef.current;
          shouldShow = idleTime >= (trigger.config.thresholdMs ?? IDLE_THRESHOLD_MS);
          break;
        }
        case 'error': {
          shouldShow = errorCountRef.current > 0 && (now - lastErrorTimeRef.current) < ERROR_COOLDOWN_MS;
          break;
        }
        case 'feature_gate': {
          const feature = trigger.config.feature as string;
          const progress = getProgress(`feature-${feature}`);
          shouldShow = !progress?.completedAt;
          break;
        }
        case 'first_visit': {
          const progress = getProgress(trigger.config.topicId as string);
          shouldShow = !progress?.startedAt;
          break;
        }
      }
      
      if (shouldShow && state.showCount < trigger.maxShowsPerSession) {
        state.showCount++;
        state.lastShown = now;
        triggerStatesRef.current.set(trigger.id, state);
        
        setActiveTriggers(prev => [...prev, trigger]);
        
        recordEvent({
          type: 'contextual_trigger',
          topicId: trigger.targetTopicId,
          metadata: { triggerId: trigger.id, condition: trigger.condition },
        });
      }
    }
  }, [settings.analyticsEnabled, getProgress, recordEvent]);

  const dismissTrigger = useCallback((triggerId: string) => {
    const state = triggerStatesRef.current.get(triggerId);
    if (state) {
      state.dismissed = true;
      triggerStatesRef.current.set(triggerId, state);
    }
    setActiveTriggers(prev => prev.filter(t => t.id !== triggerId));
    
    const trigger = helpEngine.getAllTriggers?.().find(t => t.id === triggerId);
    if (trigger) {
      recordEvent({
        type: 'contextual_dismiss',
        topicId: trigger.targetTopicId,
        metadata: { triggerId },
      });
    }
  }, [recordEvent]);

  const resetTrigger = useCallback((triggerId: string) => {
    const state = triggerStatesRef.current.get(triggerId);
    if (state) {
      state.dismissed = false;
      state.showCount = 0;
      triggerStatesRef.current.set(triggerId, state);
    }
  }, []);

  const recordError = useCallback(() => {
    errorCountRef.current++;
    lastErrorTimeRef.current = Date.now();
  }, []);

  return {
    activeTriggers,
    dismissTrigger,
    resetTrigger,
    checkTriggers,
    recordError,
  };
}