import React from 'react';
import {StatItem} from '../ui';
import {CpuChipIcon, NetworkIcon, NoteIcon, CheckCircleIcon} from '../common/icons';
import {cn} from '../../utils/ui';

interface StatsGridProps {
    stats: {total: number; public: number; tasks: number; skills: number; relays: number};
    isConnected: boolean;
}

export function StatsGrid({stats, isConnected}: StatsGridProps) {
    return (
        <section aria-label="Statistics" className="animate-fade-in-up stagger-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatItem
                    label="Agent Status"
                    value={isConnected ? 'Online' : 'Offline'}
                    icon={<CpuChipIcon className={cn('w-5 h-5', isConnected ? 'text-green-400' : 'text-gray-500')} />}
                    trend={isConnected ? 'up' : 'neutral'}
                    trendValue={isConnected ? 'Ready' : 'Local only'}
                    variant={isConnected ? 'success' : 'default'}
                />

                <StatItem
                    label="Network"
                    value={`${stats.relays} Relays`}
                    icon={<NetworkIcon className={cn('w-5 h-5', stats.relays > 0 ? 'text-purple-400' : 'text-gray-500')} />}
                    trend={stats.relays > 0 ? 'up' : 'neutral'}
                    trendValue={stats.public > 0 ? `${stats.public} Shared` : 'Private'}
                    variant={stats.relays > 0 ? 'primary' : 'default'}
                />

                <StatItem
                    label="Notes"
                    value={stats.total}
                    icon={<NoteIcon className="w-5 h-5 text-blue-400" />}
                    trend={stats.total > 0 ? 'up' : 'neutral'}
                    trendValue={`${stats.public} public`}
                    variant="primary"
                />

                <StatItem
                    label="Tasks"
                    value={stats.tasks}
                    icon={<CheckCircleIcon className="w-5 h-5 text-yellow-400" />}
                    trend={stats.tasks > 0 ? 'up' : 'neutral'}
                    trendValue={stats.tasks > 0 ? 'active' : 'none'}
                    variant="warning"
                />
            </div>
        </section>
    );
}