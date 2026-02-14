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
    SparklesIcon,
    PencilIcon,
    ArrowRightIcon
} from '../common/icons';

const TEMPLATES = {
    task: {
        title: 'New Task',
        content: '<p>Describe task...</p>',
        properties: [{key: 'status', operator: 'is', values: ['todo']}],
        tags: ['task'],
        icon: CheckCircleIcon,
        color: 'text-green-400',
        bgColor: 'bg-green-900/20',
        borderColor: 'border-green-500/30'
    },
    journal: {
        title: () => new Date().toLocaleDateString(),
        content: '<p>Thoughts...</p>',
        properties: [{key: 'type', operator: 'is', values: ['journal']}],
        tags: ['journal'],
        icon: NoteIcon,
        color: 'text-blue-400',
        bgColor: 'bg-blue-900/20',
        borderColor: 'border-blue-500/30'
    },
    idea: {
        title: 'New Idea',
        content: '<p>Idea description...</p>',
        properties: [{key: 'type', operator: 'is', values: ['idea']}],
        tags: ['idea'],
        icon: LightBulbIcon,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-500/30'
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

            {/* Quick Capture Section */}
            <div className="mb-8 p-8 bg-gradient-to-br from-gray-800/80 to-gray-900/50 rounded-3xl border border-gray-700/50 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 p-24 bg-purple-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

                <div className="relative z-10 max-w-2xl mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-black mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                        What's on your mind?
                    </h1>
                    <p className="text-gray-400 text-sm md:text-base mb-8">
                        Capture thoughts, tasks, and ideas instantly.
                    </p>

                    <form onSubmit={handleQuickCapture} className="relative mb-8">
                        <input
                            type="text"
                            value={quickCaptureInput}
                            onChange={(e) => setQuickCaptureInput(e.target.value)}
                            placeholder="Type here..."
                            className="w-full bg-gray-950/50 border border-gray-700/50 rounded-2xl py-4 px-6 pr-14 text-lg text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner placeholder-gray-600 backdrop-blur-sm"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg hover:shadow-blue-600/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                            disabled={!quickCaptureInput.trim()}
                            title="Create Note"
                        >
                            <ArrowRightIcon className="w-5 h-5 text-white"/>
                        </button>
                    </form>

                    <div className="grid grid-cols-3 gap-4">
                        {(Object.entries(TEMPLATES) as [keyof typeof TEMPLATES, typeof TEMPLATES['task']][]).map(([type, t]) => (
                            <button
                                key={type}
                                onClick={() => handleQuickTemplate(type)}
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-200 group ${t.bgColor} ${t.borderColor} hover:scale-[1.02] hover:shadow-lg`}
                            >
                                <t.icon className={`w-6 h-6 ${t.color} group-hover:scale-110 transition-transform`}/>
                                <span className={`text-xs font-semibold uppercase tracking-wide ${t.color} opacity-80 group-hover:opacity-100`}>{type}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="Agent Status"
                    value={isConnected ? 'Online' : 'Offline'}
                    icon={<CpuChipIcon className={`w-5 h-5 ${isConnected ? 'text-green-400' : 'text-gray-500'}`}/>}
                    className={isConnected ? 'border-green-500/20 bg-green-500/5' : 'border-gray-700/50'}
                    trend={isConnected ? 'up' : 'neutral'}
                    trendValue={isConnected ? 'Ready' : 'Local'}
                />

                <StatCard
                    label="Network"
                    value={`${stats.relays} Relays`}
                    icon={<NetworkIcon className={`w-5 h-5 ${stats.relays > 0 ? 'text-purple-400' : 'text-gray-500'}`}/>}
                    className={stats.relays > 0 ? 'border-purple-500/20 bg-purple-500/5' : 'border-gray-700/50'}
                    trend={stats.relays > 0 ? 'up' : 'neutral'}
                    trendValue={stats.public > 0 ? `${stats.public} Shared` : 'Private'}
                />

                <StatCard
                    label="Notes"
                    value={stats.total}
                    icon={<NoteIcon className="w-5 h-5 text-blue-400"/>}
                    trend="neutral"
                />

                <StatCard
                    label="Tasks"
                    value={stats.tasks}
                    icon={<CheckCircleIcon className="w-5 h-5 text-yellow-400"/>}
                    className="border-yellow-500/20 bg-yellow-500/5"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/30">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-100">
                            <ClockIcon className="w-5 h-5 text-gray-400"/>
                            Recent Activity
                        </h2>
                        <button
                            onClick={() => setActiveView('notes')}
                            className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider flex items-center gap-1"
                        >
                            View All <ArrowRightIcon className="w-3 h-3"/>
                        </button>
                    </div>
                    <div className="p-4">
                        <ActivityFeed recentNotes={recentNotes} onSelectNote={handleSelectNote}/>
                    </div>
                </div>

                {/* Quick Actions / Tools */}
                <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-bold text-gray-100 mb-2">Tools & Views</h2>

                    <button
                        onClick={handleCreateNote}
                        className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg flex items-center gap-4 group"
                    >
                        <div className="p-2.5 bg-white/20 rounded-lg text-white group-hover:scale-110 transition-transform">
                            <PencilIcon className="w-5 h-5"/>
                        </div>
                        <div>
                            <div className="font-bold text-white">New Note</div>
                            <div className="text-xs text-blue-100/80">Start writing</div>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveView('ontology')}
                        className="w-full text-left p-4 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 transition-all flex items-center gap-4 group"
                    >
                        <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                            <SparklesIcon className="w-5 h-5"/>
                        </div>
                        <div>
                            <div className="font-medium text-gray-200">Ontology Graph</div>
                            <div className="text-xs text-gray-500">Visualize knowledge</div>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveView('settings')}
                        className="w-full text-left p-4 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 transition-all flex items-center gap-4 group"
                    >
                        <div className="p-2.5 bg-gray-700/50 rounded-lg text-gray-400 group-hover:bg-gray-600 transition-colors">
                            <NetworkIcon className="w-5 h-5"/>
                        </div>
                        <div>
                            <div className="font-medium text-gray-200">Network Settings</div>
                            <div className="text-xs text-gray-500">Configure connections</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
