import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { PlayIcon, PauseIcon, CheckIcon, XIcon } from '../common/icons';
import { useNotes } from '../../hooks/useNotes';

interface RecordedEvent {
  timestamp: number;
  type: string;
  target?: string;
  details: string;
}

export function SkillRecorder({ onClose }: { onClose: () => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [events, setEvents] = useState<RecordedEvent[]>([]);
  const { addNote } = useNotes();
  const [skillName, setSkillName] = useState('New Skill');

  // Mock global event listener
  useEffect(() => {
    if (!isRecording) return;

    const handleEvent = (type: string, detail: string) => {
        setEvents(prev => [...prev, {
            timestamp: Date.now(),
            type,
            details: detail
        }]);
    };

    // In a real implementation, this would hook into DOM events or a browser extension
    // For now, we simulate capturing 'intent'
    const interval = setInterval(() => {
        // Randomly simulate capturing "focus" or "interaction" events for the demo
        if (Math.random() > 0.7) {
             handleEvent('interaction', 'User focused input field');
        }
    }, 2000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleSave = () => {
    const content = `
    <h3>Skill Definition: ${skillName}</h3>
    <pre>
    ${JSON.stringify(events, null, 2)}
    </pre>
    `;

    addNote({
        title: `[Skill] ${skillName}`,
        content,
        tags: ['@skill', '@recorded'],
        properties: [
            { key: 'type', operator: '=', values: ['skill'] },
            { key: 'status', operator: '=', values: ['draft'] }
        ]
    });
    onClose();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 border border-red-500/50 rounded-xl shadow-2xl p-4 w-80 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <input
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-white font-bold p-0 w-32"
            />
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><XIcon className="w-5 h-5" /></button>
      </div>

      <div className="h-32 bg-black/50 rounded-lg mb-4 p-2 overflow-y-auto font-mono text-xs text-green-400 border border-gray-800">
        {events.length === 0 ? (
            <span className="opacity-50 text-gray-400">Waiting for actions...</span>
        ) : (
            events.map((e, i) => (
                <div key={i} className="mb-1">
                    <span className="opacity-50">[{new Date(e.timestamp).toLocaleTimeString()}]</span> {e.type}: {e.details}
                </div>
            ))
        )}
      </div>

      <div className="flex justify-between">
         <Button
            size="sm"
            variant={isRecording ? 'ghost' : 'primary'}
            onClick={toggleRecording}
            className={isRecording ? 'text-red-400 border-red-900' : 'bg-red-600 hover:bg-red-500 text-white'}
            icon={isRecording ? PauseIcon : PlayIcon}
         >
            {isRecording ? 'Pause' : 'Record'}
         </Button>

         <Button
            size="sm"
            variant="primary"
            onClick={handleSave}
            disabled={events.length === 0}
            icon={CheckIcon}
            className="bg-green-600 hover:bg-green-500 text-white"
         >
            Save Skill
         </Button>
      </div>
    </div>
  );
}
