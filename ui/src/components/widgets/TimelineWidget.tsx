import React from 'react';
import { TimelineEventItem } from './TimelineEventItem';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'create' | 'update' | 'match' | 'system';
  description: string;
  metadata?: any;
}

interface TimelineWidgetProps {
  events: TimelineEvent[];
}

export function TimelineWidget({ events }: TimelineWidgetProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 italic">
        No timeline events recorded.
      </div>
    );
  }

  return (
    <div className="relative pl-4 border-l border-gray-700/50 space-y-6">
      {events.map((event) => (
        <TimelineEventItem key={event.id} event={event} />
      ))}
    </div>
  );
}
