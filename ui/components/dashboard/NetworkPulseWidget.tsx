import React from 'react';
import { NetworkIcon, CubeIcon } from '../common/icons';
import { getLogStyle } from '../../utils/ui';
import { DashboardWidget } from './DashboardWidget';
import { Button } from '../common/Button';

interface NetworkPulseWidgetProps {
  logs: Array<{ type: string; msg: string }>;
  simulatorActive: boolean;
  onStartSimulator: () => void;
}

export function NetworkPulseWidget({ logs, simulatorActive, onStartSimulator }: NetworkPulseWidgetProps) {
  const recentLogs = [...logs].reverse().slice(0, 5);

  const title = (
    <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
            Network Pulse
        </div>
        {simulatorActive && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>}
    </div>
  );

  return (
     <DashboardWidget
        className="flex flex-col h-96"
        title={title}
        icon={NetworkIcon}
        isEmpty={recentLogs.length === 0}
        emptyState={{
            icon: CubeIcon,
            title: "No recent activity",
            description: "The network is quiet. Start the simulator to see events.",
            action: !simulatorActive ? (
                <Button
                    onClick={onStartSimulator}
                    variant="ghost"
                    size="sm"
                    className="bg-blue-900/30 text-blue-400 border border-blue-900 hover:bg-blue-900/50"
                >
                    Start Simulator
                </Button>
            ) : undefined
        }}
     >
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {recentLogs.map((log, i) => (
                <div key={i} className={`text-xs p-3 rounded-lg border-l-2 border-gray-800 ${getLogStyle(log.type)}`}>
                    <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-500 font-mono uppercase text-[10px] opacity-75">{log.type}</span>
                    </div>
                    <p className="leading-relaxed opacity-90">{log.msg}</p>
                </div>
            ))}
        </div>
     </DashboardWidget>
  );
};
