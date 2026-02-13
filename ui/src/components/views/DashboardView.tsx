import React, {useEffect, useState} from 'react';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {useSettings} from '../../hooks/useSettingsContext';
import {agentService} from '../../services/AgentService';
import {StatCard} from '../widgets/StatCard';
import {ActivityFeed} from '../widgets/ActivityFeed';
import {
    CheckCircleIcon,
    CpuChipIcon,
    LightBulbIcon,
    NetworkIcon,
    NoteIcon,
    PlusIcon,
    SparklesIcon
} from '../common/icons';

const TEMPLATES = {
    task: {
        title: 'New Task',
        content: '<p>Describe task...</p>',
        properties: [{key: 'status', operator: 'is', values: ['todo']}],
        tags: ['task']
    },
    journal: {
        title: () => new Date().toLocaleDateString(),
        content: '<p>Thoughts...</p>',
        properties: [{key: 'type', operator: 'is', values: ['journal']}],
        tags: ['journal']
    },
    idea: {
        title: 'New Idea',
        content: '<p>Idea description...</p>',
        properties: [{key: 'type', operator: 'is', values: ['idea']}],
        tags: ['idea']
    }
};

export function DashboardView() {
    const {notes, addNote} = useNotes();
    const {setActiveView, setSelectedNoteId} = useView();
    const {settings} = useSettings();
    const [quickCaptureInput, setQuickCaptureInput] = useState('');
    const [agentStatus, setAgentStatus] = useState(agentService.getStatus());

    useEffect(() => {
        const handleStatusChange = (status: any) => setAgentStatus(status);
        agentService.on('status_change', handleStatusChange);
        return () => {
            agentService.off('status_change', handleStatusChange);
        };
    }, []);

    const handleCreateNote = () => {
        const newNote = addNote({title: ''});
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
    };

    const handleQuickCapture = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickCaptureInput.trim()) return;

        const note = addNote({
            title: 'Quick Note',
            content: `<p>${quickCaptureInput}</p>`,
            tags: ['quick-capture']
        });

        setSelectedNoteId(note.id);
        setActiveView('notes');
    };

    const handleQuickTemplate = (type: keyof typeof TEMPLATES) => {
        const template = TEMPLATES[type];
        const title = typeof template.title === 'function' ? template.title() : template.title;

        const note = addNote({
            title,
            content: template.content,
            tags: template.tags,
            properties: template.properties
        });
        setSelectedNoteId(note.id);
        setActiveView('notes');
    };

    const stats = notes.reduce((acc, n) => {
        acc.total++;
        if (n.privacy === 'public') acc.public++;
        if (n.properties.some(p => p.key === 'status' && p.values.includes('todo'))) acc.tasks++;
        if (n.source?.type === 'skill') acc.skills++;
        return acc;
    }, {total: 0, public: 0, tasks: 0, skills: 0, relays: settings.nostr?.relays?.length || 0});

    const recentNotes = [...notes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

    const handleSelectNote = (id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    };

    const isConnected = agentStatus.status === 'connected';

    return (
        <div className="p-6 h-full overflow-y-auto bg-gray-900 text-white custom-scrollbar">

            <div
                className="mb-8 text-center py-10 bg-gradient-to-b from-gray-800/50 to-transparent rounded-2xl border border-gray-700/50 relative overflow-hidden group">
                <div
                    className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-10 transition-opacity duration-1000"></div>
                <h1 className="text-3xl font-black mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    Quick Capture
                </h1>
                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                    Capture thoughts instantly. Organize later.
                </p>

                <form onSubmit={handleQuickCapture} className="max-w-lg mx-auto relative z-10 mb-4">
                    <input
                        type="text"
                        value={quickCaptureInput}
                        onChange={(e) => setQuickCaptureInput(e.target.value)}
                        placeholder="Type a thought, task, or idea..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-full py-3 px-6 pr-12 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-lg placeholder-gray-600"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 rounded-full transition-colors"
                        title="Create Note"
                    >
                        <PlusIcon className="w-4 h-4 text-white"/>
                    </button>
                </form>

                <div className="flex justify-center gap-3 relative z-10">
                    <button
                        onClick={() => handleQuickTemplate('task')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-xs text-gray-300 border border-gray-700 transition-colors"
                    >
                        <CheckCircleIcon className="w-3 h-3 text-green-400"/> Task
                    </button>
                    <button
                        onClick={() => handleQuickTemplate('journal')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-xs text-gray-300 border border-gray-700 transition-colors"
                    >
                        <NoteIcon className="w-3 h-3 text-blue-400"/> Journal
                    </button>
                    <button
                        onClick={() => handleQuickTemplate('idea')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-xs text-gray-300 border border-gray-700 transition-colors"
                    >
                        <LightBulbIcon className="w-3 h-3 text-yellow-400"/> Idea
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
                <StatCard
                    label="Agent Status"
                    value={isConnected ? 'Online' : 'Offline'}
                    icon={<CpuChipIcon
                        className={`w-5 h-5 ${isConnected ? 'text-green-400' : 'text-gray-500'}`}/>}
                    className={isConnected ? 'border-green-900/30 bg-green-900/5' : 'border-gray-700/50'}
                    trend={isConnected ? 'up' : 'neutral'}
                    trendValue={isConnected ? 'Ready' : 'Local Mode'}
                />

                <StatCard
                    label="P2P Network"
                    value={`${stats.relays} Relays`}
                    icon={<NetworkIcon
                        className={`w-5 h-5 ${stats.relays > 0 ? 'text-purple-400' : 'text-gray-500'}`}/>}
                    className={stats.relays > 0 ? 'border-purple-900/30 bg-purple-900/5' : 'border-gray-700/50'}
                    trend={stats.relays > 0 ? 'up' : 'neutral'}
                    trendValue={stats.public > 0 ? `${stats.public} Shared` : 'No Public Notes'}
                />

                <StatCard
                    label="Total Notes"
                    value={stats.total}
                    icon={<NoteIcon className="w-5 h-5 text-blue-400"/>}
                    trend="neutral"
                />

                <StatCard
                    label="Pending Tasks"
                    value={stats.tasks}
                    icon={<CheckCircleIcon className="w-5 h-5 text-yellow-400"/>}
                    className="border-blue-900/30 bg-blue-900/10"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20 md:mb-0">
                <div className="lg:col-span-2 bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 md:p-6">
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <NoteIcon className="w-5 h-5 text-gray-400"/>
                            Recent Activity
                        </h2>
                        <button
                            onClick={() => setActiveView('notes')}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors uppercase font-semibold tracking-wide"
                        >
                            View All
                        </button>
                    </div>
                    <ActivityFeed recentNotes={recentNotes} onSelectNote={handleSelectNote}/>
                </div>

                <div
                    className="bg-gray-800/30 rounded-xl border border-gray-700/30 p-4 md:p-6 flex flex-col gap-3 md:gap-4">
                    <h2 className="text-lg font-bold mb-2">Quick Actions</h2>

                    <button
                        onClick={handleCreateNote}
                        className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 transition-all shadow-lg flex items-center gap-3 group"
                    >
                        <div className="p-2 bg-white/20 rounded-lg text-white">
                            <PlusIcon className="w-5 h-5"/>
                        </div>
                        <div>
                            <div className="font-bold text-white">Create Note</div>
                            <div className="text-xs text-blue-100 opacity-80">Capture a new thought</div>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveView('ontology')}
                        className="w-full text-left p-4 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 transition-all flex items-center gap-3 group"
                    >
                        <div
                            className="p-2 bg-purple-900/30 rounded-lg text-purple-400 group-hover:bg-purple-900/50 transition-colors">
                            <SparklesIcon className="w-5 h-5"/>
                        </div>
                        <div>
                            <div className="font-medium text-gray-200">Ontology Graph</div>
                            <div className="text-xs text-gray-500">Explore relationships</div>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveView('settings')}
                        className="w-full text-left p-4 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 transition-all flex items-center gap-3 group"
                    >
                        <div
                            className="p-2 bg-gray-700/50 rounded-lg text-gray-400 group-hover:bg-gray-700 transition-colors">
                            <NetworkIcon className="w-5 h-5"/>
                        </div>
                        <div>
                            <div className="font-medium text-gray-200">Configure Network</div>
                            <div className="text-xs text-gray-500">Manage relays & privacy</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
