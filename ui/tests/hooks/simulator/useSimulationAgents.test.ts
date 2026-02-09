import {act, renderHook} from '@testing-library/react';
import {useSimulationAgents} from '../../../src/hooks/simulator/useSimulationAgents';
import {describe, expect, it} from 'vitest';

describe('useSimulationAgents', () => {
    it('should initialize with default agents', () => {
        const {result} = renderHook(() => useSimulationAgents());
        // Default agents now include 'The Assistant' + Alice + Bob = 3
        expect(result.current.agents).toHaveLength(3);
        // The first agent is now The Assistant, Alice is second
        expect(result.current.agents[1].name).toContain('Alice');
    });

    it('should update agent state', () => {
        const {result} = renderHook(() => useSimulationAgents());

        act(() => {
            result.current.updateAgent(0, {status: 'Thinking'});
        });

        expect(result.current.agents[0].status).toBe('Thinking');
    });

    it('should update ref when state changes', () => {
        const {result} = renderHook(() => useSimulationAgents());

        act(() => {
            result.current.updateAgent(0, {currentDraft: 'Hello'});
        });

        expect(result.current.agentsRef.current[0].currentDraft).toBe('Hello');
    });
});
