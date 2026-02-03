import React from 'react';
import { PencilIcon, NetworkIcon, ChatIcon, CpuChipIcon, ClockIcon } from '../common/icons';
import { Card } from '../common/Card';
import { QuickActionBtn } from './QuickActionBtn';

interface QuickActionsWidgetProps {
  onCreateNote: () => void;
  onNavigate: (view: string) => void;
  showSimulator?: boolean;
}

export function QuickActionsWidget({ onCreateNote, onNavigate, showSimulator }: QuickActionsWidgetProps) {
  return (
    <Card title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickActionBtn
                onClick={onCreateNote}
                icon={PencilIcon}
                label="Write"
                colorClass="bg-blue-600/20 text-blue-400 group-hover:bg-blue-600"
                hoverBorder="hover:border-blue-500/50"
                hoverShadow="hover:shadow-blue-900/10"
            />
            <QuickActionBtn
                onClick={() => onNavigate('network')}
                icon={NetworkIcon}
                label="Network"
                colorClass="bg-green-600/20 text-green-400 group-hover:bg-green-600"
                hoverBorder="hover:border-green-500/50"
                hoverShadow="hover:shadow-green-900/10"
            />
            <QuickActionBtn
                onClick={() => onNavigate('chat')}
                icon={ChatIcon}
                label="Chat"
                colorClass="bg-purple-600/20 text-purple-400 group-hover:bg-purple-600"
                hoverBorder="hover:border-purple-500/50"
                hoverShadow="hover:shadow-purple-900/10"
            />
             <QuickActionBtn
                onClick={() => onNavigate('time')}
                icon={ClockIcon}
                label="Calendar"
                colorClass="bg-cyan-600/20 text-cyan-400 group-hover:bg-cyan-600"
                hoverBorder="hover:border-cyan-500/50"
                hoverShadow="hover:shadow-cyan-900/10"
            />
            {showSimulator && (
                <QuickActionBtn
                    onClick={() => onNavigate('simulator')}
                    icon={CpuChipIcon}
                    label="Simulator"
                    colorClass="bg-orange-600/20 text-orange-400 group-hover:bg-orange-600"
                    hoverBorder="hover:border-orange-500/50"
                    hoverShadow="hover:shadow-orange-900/10"
                />
            )}
        </div>
    </Card>
  );
};
