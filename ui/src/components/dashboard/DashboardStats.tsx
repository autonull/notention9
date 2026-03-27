import React from 'react';
import { NoteIcon, HomeIcon } from '../common/icons';
import { Card } from '../common/Card';

interface DashboardStatsProps {
  totalNotes: number;
  pinnedNotes: number;
}

export function DashboardStats({ totalNotes, pinnedNotes }: DashboardStatsProps) {
  const stats = [
    { label: 'Total Notes', value: totalNotes, icon: NoteIcon, color: 'text-blue-400', bg: 'bg-blue-600/20' },
    { label: 'Pinned', value: pinnedNotes, icon: HomeIcon, color: 'text-yellow-400', bg: 'bg-yellow-600/20' },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
         {stats.map((stat, i) => (
            <Card key={i} className="flex items-center gap-3 !p-2 min-w-[140px] bg-gray-800/50 border-gray-700/30">
                <div className={`p-2 rounded-md ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                </div>
            </Card>
        ))}
    </div>
  );
};
