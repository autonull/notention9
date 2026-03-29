import React from 'react';
import { useNotes } from '../../hooks/useNotes';
import { useView } from '../../hooks/useViewContext';
import { StatCard } from '../dashboard/StatCard';
import { ActivityFeed } from '../dashboard/ActivityFeed';
import { NoteIcon, WorldIcon, CheckCircleIcon, SparklesIcon } from '../common/icons';

export function DashboardView() {
  const { notes, addNote } = useNotes();
  const { setActiveView, setSelectedNoteId } = useView();

  const handleCreateNote = () => {
    const newNote = addNote({ title: '' });
    setSelectedNoteId(newNote.id);
    setActiveView('notes');
  };

  const stats = {
    total: notes.length,
    public: notes.filter(n => n.public).length,
    tasks: notes.filter(n => n.properties.some(p => p.key === 'intent' && p.values.includes('task'))).length,
    skills: notes.filter(n => n.source?.type === 'skill').length
  };

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    setActiveView('notes');
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-900 text-white custom-scrollbar">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome back, Agent</h1>
        <p className="text-gray-400 text-sm">Here's what's happening in your semantic network.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Notes"
          value={stats.total}
          icon={<NoteIcon className="w-5 h-5"/>}
          trend="neutral"
        />
        <StatCard
          label="Public Shared"
          value={stats.public}
          icon={<WorldIcon className="w-5 h-5"/>}
          className="border-green-900/30 bg-green-900/10"
        />
        <StatCard
          label="Pending Tasks"
          value={stats.tasks}
          icon={<CheckCircleIcon className="w-5 h-5"/>}
          className="border-blue-900/30 bg-blue-900/10"
        />
        <StatCard
          label="Skill Actions"
          value={stats.skills}
          icon={<SparklesIcon className="w-5 h-5"/>}
          className="border-purple-900/30 bg-purple-900/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">Recent Activity</h2>
            <button
                onClick={() => setActiveView('notes')}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
                View All
            </button>
          </div>
          <ActivityFeed recentNotes={recentNotes} onSelectNote={handleSelectNote} />
        </div>

        <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 p-6">
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
                <button
                    onClick={handleCreateNote}
                    className="w-full text-left p-3 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all flex items-center gap-3 group"
                >
                    <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400 group-hover:bg-blue-900/50 transition-colors">
                        <NoteIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-medium text-sm">Create New Note</div>
                        <div className="text-xs text-gray-500">Start capturing thoughts</div>
                    </div>
                </button>

                <button
                    onClick={() => setActiveView('ontology')}
                    className="w-full text-left p-3 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all flex items-center gap-3 group"
                >
                    <div className="p-2 bg-purple-900/30 rounded-lg text-purple-400 group-hover:bg-purple-900/50 transition-colors">
                        <SparklesIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-medium text-sm">Manage Ontology</div>
                        <div className="text-xs text-gray-500">Define your domain</div>
                    </div>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
