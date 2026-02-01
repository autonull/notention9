import React, { ReactNode } from 'react';
import { useSimulator } from '../../hooks/simulator/useSimulator';
import { SimulatorContext } from './SimulatorContext';

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const simulator = useSimulator();

  return (
    <SimulatorContext.Provider value={simulator}>
      {children}
    </SimulatorContext.Provider>
  );
};
