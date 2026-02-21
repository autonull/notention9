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
    ArrowRightIcon,
    ClockIcon
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
            <div className="mb-8 p-8 bg-gradient-to-br from-gray-900/90 via-indigo-950/40 to-gray-900/90 rounded-3xl border border-gray-700/50 relative overflow-hidden shadow-2xl backdrop-blur-sm group hover:border-indigo-500/30 transition-colors duration-500">
                <div className="absolute top-0 right-0 p-48 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none animate-pulse"></div>
                <div className="absolute bottom-0 left-0 p-32 bg-purple-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none animate-pulse delay-700"></div>

                <div className="relative z-10 max-w-2xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-white drop-shadow-sm">
                        What's on your mind?
                    </h1>
                    <p className="text-gray-400 text-sm md:text-base mb-8 font-medium tracking-wide">
                        Capture thoughts, tasks, and ideas instantly.
                    </p>

                    <form onSubmit={handleQuickCapture} className="relative mb-10 group/input">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500"></div>
                        <input
                            type="text"
                            value={quickCaptureInput}
                            onChange={(e) => setQuickCaptureInput(e.target.value)}
                            placeholder="Type here..."
                            className="relative w-full bg-gray-950/80 border border-gray-700/50 rounded-2xl py-5 px-7 pr-16 text-lg text-white focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner placeholder-gray-500 backdrop-blur-md"
                        />
                        <button
                            type="submit"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
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
                                className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border transition-all duration-300 group ${t.bgColor} ${t.borderColor} hover:scale-[1.02] hover:shadow-lg hover:bg-opacity-80 active:scale-[0.98]`}
                            >
                                <div className={`p-2 rounded-lg bg-white/5 ring-1 ring-white/10 group-hover:bg-white/10 transition-colors`}>
                                    <t.icon className={`w-6 h-6 ${t.color} group-hover:scale-110 transition-transform duration-300`}/>
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-wider ${t.color} opacity-75 group-hover:opacity-100 transition-opacity`}>{type}</span>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-gray-900/50 rounded-3xl border border-gray-700/30 overflow-hidden flex flex-col backdrop-blur-sm shadow-xl">
                    <div className="p-6 border-b border-gray-700/30 flex justify-between items-center bg-gray-800/20">
                        <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                            <div className="p-2 bg-gray-800 rounded-lg text-gray-300">
                                <ClockIcon className="w-5 h-5"/>
                            </div>
                            Recent Activity
                        </h2>
                        <button
                            onClick={() => setActiveView('notes')}
                            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-all uppercase tracking-wider flex items-center gap-2 border border-gray-700 hover:border-gray-600"
                        >
                            View All <ArrowRightIcon className="w-3 h-3"/>
                        </button>
                    </div>
                    <div className="p-6">
                        <ActivityFeed recentNotes={recentNotes} onSelectNote={handleSelectNote}/>
                    </div>
                </div>

                {/* Quick Actions / Tools */}
                <div className="bg-gray-900/50 rounded-3xl border border-gray-700/30 p-6 flex flex-col gap-4 backdrop-blur-sm shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-2 px-2">Tools & Views</h2>

                    <button
                        onClick={handleCreateNote}
                        className="w-full text-left p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-5 group border border-transparent hover:scale-[1.02]"
                    >
                        <div className="p-3 bg-white/20 rounded-xl text-white group-hover:rotate-12 transition-transform duration-300 shadow-inner">
                            <PencilIcon className="w-6 h-6"/>
                        </div>
                        <div>
                            <div className="font-bold text-white text-lg">New Note</div>
                            <div className="text-sm text-blue-100/90 font-medium">Start writing</div>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveView('ontology')}
                        className="w-full text-left p-4 rounded-2xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all flex items-center gap-5 group hover:shadow-lg"
                    >
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 group-hover:bg-purple-500/20 transition-colors ring-1 ring-purple-500/20">
                            <SparklesIcon className="w-6 h-6"/>
                        </div>
                        <div>
                            <div className="font-bold text-gray-200">Ontology Graph</div>
                            <div className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">Visualize knowledge</div>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveView('settings')}
                        className="w-full text-left p-4 rounded-2xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all flex items-center gap-5 group hover:shadow-lg"
                    >
                        <div className="p-3 bg-gray-700/50 rounded-xl text-gray-400 group-hover:bg-gray-600/80 transition-colors ring-1 ring-gray-600/30">
                            <NetworkIcon className="w-6 h-6"/>
                        </div>
                        <div>
                            <div className="font-bold text-gray-200">Network Settings</div>
                            <div className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">Configure connections</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
