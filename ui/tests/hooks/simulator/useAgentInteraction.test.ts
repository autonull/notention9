import {act, renderHook} from '@testing-library/react';
import {useAgentInteraction} from '../../../src/hooks/simulator/useAgentInteraction';
import {beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import type {SimulationAgent} from '../../../src/hooks/simulator/types';
import type {AIProvider} from '@notention/core';

describe('useAgentInteraction', () => {
    let agentsRefMock: { current: SimulationAgent[] };
    let aiRefMock: { current: AIProvider | null };
    let updateAgentMock: Mock;
    let addLogMock: Mock;

    beforeEach(() => {
        agentsRefMock = {
            current: [
                {id: '1', name: 'Agent1', persona: 'Test Persona', goal: 'Test Goal', status: 'Idle', currentDraft: ''}
            ]
        };
        aiRefMock = {current: null};
        updateAgentMock = vi.fn();
        addLogMock = vi.fn();
    });

    it('adds user message immediately', async () => {
        const {result} = renderHook(() => useAgentInteraction({
            agentsRef: agentsRefMock,
            aiRef: aiRefMock,
            updateAgent: updateAgentMock,
            addLog: addLogMock
        }));

        act(() => {
            result.current.sendMessageToAgent('1', 'Hello');
        });

        expect(result.current.agentMessages['1']).toHaveLength(1);
        expect(result.current.agentMessages['1'][0].content).toBe('Hello');
        expect(result.current.agentMessages['1'][0].pubkey).toBe('user');
    });

    it('simulates response after delay', async () => {
        vi.useFakeTimers();

        const {result} = renderHook(() => useAgentInteraction({
            agentsRef: agentsRefMock,
            aiRef: aiRefMock,
            updateAgent: updateAgentMock,
            addLog: addLogMock
        }));

        act(() => {
            result.current.sendMessageToAgent('1', 'Hello');
        });

        expect(result.current.agentMessages['1']).toHaveLength(1);

        await act(async () => {
            vi.runAllTimers();
        });

        expect(result.current.agentMessages['1']).toHaveLength(2);
        expect(result.current.agentMessages['1'][1].pubkey).toBe('1');
        expect(addLogMock).toHaveBeenCalledWith(expect.stringContaining('replied'), 'match');

        vi.useRealTimers();
    });
});
