import React, { useState } from 'react';
import { Card } from '../common/Card';
import { SparklesIcon, PencilIcon, NetworkIcon, ChatIcon, CpuChipIcon, ClockIcon, PlayIcon } from '../common/icons';
import { HybridInput } from '../editor/HybridInput';
import { QuickActionBtn } from './QuickActionBtn';
import { SkillRecorder } from '../skills/SkillRecorder';

interface CommandCenterWidgetProps {
  onCreateNote: () => void;
  onNavigate: (view: string) => void;
  showSimulator?: boolean;
}

export function CommandCenterWidget({ onCreateNote, onNavigate, showSimulator }: CommandCenterWidgetProps) {
    const [showRecorder, setShowRecorder] = useState(false);

    return (
        <Card
            title="Command Center"
            icon={SparklesIcon}
            className="shadow-xl relative group"
            variant="default"
        >
             <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <SparklesIcon className="w-24 h-24 text-purple-500 transform rotate-12" />
                </div>
             </div>

             {showRecorder && <SkillRecorder onClose={() => setShowRecorder(false)} />}

            <div className="relative z-10 space-y-6">
                <HybridInput />

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-gray-700/50">
                    <QuickActionBtn
                        onClick={onCreateNote}
                        icon={PencilIcon}
                        label="Write"
                        colorClass="bg-blue-600/20 text-blue-400 group-hover:bg-blue-600"
                        hoverBorder="hover:border-blue-500/50"
                        hoverShadow="hover:shadow-blue-900/10"
                    />
                    <QuickActionBtn
                        onClick={() => setShowRecorder(true)}
                        icon={PlayIcon}
                        label="Rec Skill"
                        colorClass="bg-red-600/20 text-red-400 group-hover:bg-red-600"
                        hoverBorder="hover:border-red-500/50"
                        hoverShadow="hover:shadow-red-900/10"
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
            </div>
        </Card>
    );
}
