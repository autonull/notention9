import React from 'react';
import { DocumentDuplicateIcon } from '../common/icons';
import { DEFAULT_TEMPLATES } from '@notention/core';
import { DashboardWidget } from './DashboardWidget';

interface TemplatesWidgetProps {
  onUseTemplate: (content: string) => void;
  onViewAll: () => void;
}

export function TemplatesWidget({ onUseTemplate, onViewAll }: TemplatesWidgetProps) {
  return (
     <DashboardWidget title="Start from Template" icon={DocumentDuplicateIcon}>
        <div className="space-y-3">
            {DEFAULT_TEMPLATES.slice(0, 3).map(tmpl => (
                <button
                    key={tmpl.id}
                    onClick={() => onUseTemplate(tmpl.content)}
                    className="w-full flex items-center gap-3 p-3 bg-gray-900/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl transition-colors text-left group"
                >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{tmpl.icon}</span>
                    <div>
                        <div className="font-medium text-gray-200 group-hover:text-white">{tmpl.label}</div>
                        <div className="text-xs text-gray-500">Create new</div>
                    </div>
                </button>
            ))}
             <button
                onClick={onViewAll}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-300 py-2"
            >
                View all templates in Sidebar
            </button>
        </div>
     </DashboardWidget>
  );
};
