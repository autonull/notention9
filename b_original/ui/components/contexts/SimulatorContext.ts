import { createContext } from 'react';
import { useSimulator } from '../../hooks/simulator/useSimulator';

type UseSimulatorReturn = ReturnType<typeof useSimulator>;

export const SimulatorContext = createContext<UseSimulatorReturn | null>(null);
