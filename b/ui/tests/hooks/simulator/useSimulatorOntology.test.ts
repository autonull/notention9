import { renderHook, act } from '@testing-library/react';
import { useSimulatorOntology } from '../../../hooks/simulator/useSimulatorOntology';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import type { OntologyNode } from '@notention/core';

describe('useSimulatorOntology', () => {
    let ontologyRefMock: { current: OntologyNode[] };
    let setOntologyMock: Mock;
    let gardenerRefMock: { current: { optimizeOntology: Mock } };
    let addLogMock: Mock;

    beforeEach(() => {
        ontologyRefMock = { current: [] };
        setOntologyMock = vi.fn();
        gardenerRefMock = {
            current: {
                optimizeOntology: vi.fn().mockResolvedValue({ merged: [], pruned: [] })
            }
        };
        addLogMock = vi.fn();
    });

    it('calls optimizeOntology on gardener', async () => {
        const { result } = renderHook(() => useSimulatorOntology({
            ontologyRef: ontologyRefMock,
            setOntology: setOntologyMock,
            gardenerRef: gardenerRefMock,
            addLog: addLogMock
        }));

        await act(async () => {
            await result.current.optimizeOntology();
        });

        expect(gardenerRefMock.current.optimizeOntology).toHaveBeenCalled();
        expect(addLogMock).toHaveBeenCalledWith(expect.stringContaining('Starting'), 'info');
    });
});
