import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../utils';

interface TabsContextType {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within Tabs');
  }
  return context;
}

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={cn('flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabList({ children, className }: TabListProps) {
  return <div className={cn('flex gap-1', className)}>{children}</div>;
}

interface TabProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Tab({ value, children, className, disabled }: TabProps) {
  const { value: activeValue, onChange } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => !disabled && onChange(value)}
      disabled={disabled}
      className={cn(
        'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
        isActive
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabPanelsProps {
  children: React.ReactNode;
  className?: string;
}

export function TabPanels({ children, className }: TabPanelsProps) {
  return <div className={cn('flex-1 flex flex-col min-h-0', className)}>{children}</div>;
}

interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { value: activeValue } = useTabsContext();
  const isActive = activeValue === value;

  if (!isActive) return null;

  return <div className={cn('flex-1 flex flex-col min-h-0', className)}>{children}</div>;
}

export { Tabs as default };