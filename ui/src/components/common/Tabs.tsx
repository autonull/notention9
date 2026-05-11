import React from 'react';
import { Badge } from './Badge';

interface Tab {
    id: string;
    label: string;
    count?: number;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (id: string) => void;
    className?: string;
}

export function Tabs({tabs, activeTab, onChange, className = ''}: TabsProps) {
    return (
        <div
            className={`flex bg-gray-900 rounded-lg p-1 ${className}`}
            role="tablist"
        >
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                    id={`tab-${tab.id}`}
                    onClick={() => onChange(tab.id)}
                    className={`
            px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2
            ${
                        activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-400 hover:text-white'
                    }
          `}
                >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                        <Badge
                            variant={activeTab === tab.id ? 'primary' : 'default'}
                            size="sm"
                            pill
                            className={activeTab === tab.id ? 'bg-blue-800 border-blue-700' : ''}
                        >
                            {tab.count}
                        </Badge>
                    )}
                </button>
            ))}
        </div>
    );
}
