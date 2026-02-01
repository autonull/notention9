import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ControlMode = 'manual' | 'assist' | 'auto';

interface ControlModeContextType {
  mode: ControlMode;
  setMode: (mode: ControlMode) => void;
}

const ControlModeContext = createContext<ControlModeContextType | undefined>(undefined);

export function ControlModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ControlMode>('manual');

  return (
    <ControlModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ControlModeContext.Provider>
  );
}

export function useControlMode() {
  const context = useContext(ControlModeContext);
  if (context === undefined) {
    throw new Error('useControlMode must be used within a ControlModeProvider');
  }
  return context;
}
