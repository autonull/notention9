import React from 'react';
import { Film, Play } from 'lucide-react';
import { Button } from '../components/ui';
import { cn } from '../utils';
import { DesignTokens } from '../components/ui';

interface NoJobViewProps {
  onNavigate: () => void;
}

export const NoJobView = ({ onNavigate }: NoJobViewProps) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-6 p-8">
    <div className={cn('w-24 h-24 rounded-full flex items-center justify-center mb-4', DesignTokens.colors.background.card)}>
      <Film size={48} className="opacity-50" />
    </div>
    <div className="text-center">
      <h2 className={cn(DesignTokens.typography.heading1, 'text-white mb-2')}>No Active Production</h2>
      <p className={cn(DesignTokens.colors.text.muted, 'mb-6 max-w-md')}>Ready to start a new simulation movie?</p>
      <Button onClick={onNavigate} icon={<Play size={20} />} size="lg">
        Go to Studio
      </Button>
    </div>
  </div>
);

NoJobView.displayName = 'NoJobView';