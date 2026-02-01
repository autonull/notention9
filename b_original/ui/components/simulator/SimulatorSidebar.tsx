import React from 'react';
import { CubeIcon, CpuChipIcon, PlusIcon, UserGroupIcon, DownloadIcon } from "../common/icons";
import { Badge } from '../common/Badge';
import { IconButton } from '../common/IconButton';
import { Button } from '../common/Button';
import type { SimulationAgent } from '../../hooks/simulator/types';

interface SimulatorSidebarProps {
  aiProviderName: string;
  active: boolean;
  setActive: (active: boolean) => void;
  importUserNotes: () => void;
  selectedView: string;
  setSelectedView: (view: string) => void;
  addAgent: () => void;
  onOpenSwarmModal: () => void;
  agents: SimulationAgent[];
  notifications: Record<string, unknown[]>;
}

export function SimulatorSidebar({
  aiProviderName,
  active,
  setActive,
  importUserNotes,
  selectedView,
  setSelectedView,
  addAgent,
  onOpenSwarmModal,
  agents,
  notifications
}: SimulatorSidebarProps) {
  const isMock = aiProviderName.includes("Mock");

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-800 flex flex-col gap-3">
        <h1 className="text-lg font-bold flex items-center gap-2 text-white">
            <span className="text-xl">🧪</span> Simulator
        </h1>
        <div className="flex justify-between items-center bg-gray-950 p-2 rounded-lg border border-gray-800">
            <Badge variant={isMock ? 'warning' : 'success'} size="sm">
                AI: {aiProviderName}
            </Badge>
            <Button
                onClick={() => setActive(!active)}
                variant={active ? 'danger' : 'success'}
                size="xs"
            >
                {active ? 'STOP' : 'START'}
            </Button>
        </div>

        <Button
            onClick={importUserNotes}
            variant="secondary"
            size="sm"
            icon={DownloadIcon}
            className="w-full"
        >
            Import My Notes
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          <Button
            onClick={() => setSelectedView('overview')}
            variant={selectedView === 'overview' ? 'primary' : 'ghost'}
            className={`w-full justify-start ${selectedView !== 'overview' ? 'text-gray-400 hover:text-gray-200' : ''}`}
            icon={CubeIcon}
          >
              Overview
          </Button>

          <div className="mt-6 mb-2 px-3 flex justify-between items-center group">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-400 transition-colors">Agents</span>
              <div className="flex gap-1 opacity-100 transition-opacity">
                   <IconButton
                       onClick={addAgent}
                       title="Add Single Agent"
                       icon={PlusIcon}
                       variant="secondary"
                       size="sm"
                   />
                  <Button
                      onClick={onOpenSwarmModal}
                      variant="ghost"
                      size="xs"
                      className="!text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900/50"
                      icon={UserGroupIcon}
                      title="Deploy Agent Swarm"
                    >
                      SWARM
                  </Button>
              </div>
          </div>

          <div className="space-y-1">
            {agents.map(agent => {
                const isSelected = selectedView === agent.id;
                const hasNotification = notifications[agent.id]?.length > 0;

                return (
                    <Button
                        key={agent.id}
                        onClick={() => setSelectedView(agent.id)}
                        variant={isSelected ? 'secondary' : 'ghost'}
                        className={`w-full justify-start ${!isSelected ? 'text-gray-400 hover:text-gray-200' : ''}`}
                    >
                         <div className="relative mr-2 flex-shrink-0">
                            <CpuChipIcon className={`w-5 h-5 ${agent.status === 'Typing...' ? 'text-green-400 animate-pulse' : 'text-gray-500'}`} />
                            {hasNotification && (
                                 <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-gray-900"></span>
                            )}
                        </div>
                        <span className="truncate">{agent.name}</span>
                    </Button>
                );
            })}
          </div>
      </div>
    </div>
  );
};
