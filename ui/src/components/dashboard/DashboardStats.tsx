import React, {useMemo} from 'react';
import type {View} from '@notention/core';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {useSettings} from '../../hooks/useSettingsContext';
import {agentService} from '../../services/AgentService';
import {StatItem} from '../ui';
import {useEffect, useState} from 'react';
import {
    CheckCircleIcon,
    CpuChipIcon,
    NetworkIcon,
    NoteIcon,
} from '../ui/icons';
import {cn} from '../../utils/ui';

interface DashboardStatsProps {
    showFeatures?: boolean;
    setShowFeatures?: (show: boolean) => void;
}

export function DashboardStats({showFeatures, setShowFeatures}: DashboardStatsProps) {
    const {notes, loading: notesLoading} = useNotes();
    const {settings} = useSettings();
    const [agentStatus, setAgentStatus] = useState({status: 'offline'});

    useEffect(() => {
        const handleStatusChange = (status: {status: string}) => setAgentStatus(status);
        agentService.on('status_change', handleStatusChange);
        return () => agentService.off('status_change', handleStatusChange);
    }, []);

    const isConnected = agentStatus.status === 'connected';

    const stats = useMemo(() => notes.reduce((acc, n) => {
        acc.total++;
        if (n.privacy === 'public') acc.public++;
        if (n.properties.some(p => p.key === 'status' && p.values.includes('todo'))) acc.tasks++;
        if (n.source?.type === 'skill') acc.skills++;
        return acc;
    }, {total: 0, public: 0, tasks: 0, skills: 0, relays: settings.nostr?.relays?.length || 0}), [notes, settings.nostr?.relays?.length]);

    if (notesLoading) {
        return (
            <section aria-label="Statistics" className="animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatItem label="Loading..." value="" />
                    <StatItem label="Loading..." value="" />
                    <StatItem label="Loading..." value="" />
                    <StatItem label="Loading..." value="" />
                </div>
            </section>
        );
    }

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