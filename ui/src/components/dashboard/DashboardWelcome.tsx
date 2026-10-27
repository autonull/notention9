import React from 'react';
import {Button} from '../ui';
import {PlusIcon, BoltIcon, SparklesIcon, MagicWandIcon, ShieldIcon} from '../ui/icons';
import {cn} from '../../utils/ui';
import {modShortcut} from '../../utils/platform';

interface DashboardWelcomeProps {
    onCreateNote: () => void;
    onToggleFeatures: () => void;
    showFeatures: boolean;
    loadSampleWorkspace?: () => void;
    showSampleWorkspace?: boolean;
}

export function DashboardWelcome({onCreateNote, onToggleFeatures, showFeatures, loadSampleWorkspace, showSampleWorkspace = false}: DashboardWelcomeProps) {
    return (
        <>
            {/* Welcome Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-down">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                        Welcome back
                    </h1>
                    <p className="mt-1 text-gray-400">
                        Capture thoughts, discover connections, build knowledge.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button
                        onClick={onCreateNote}
                        leftIcon={<PlusIcon className="w-5 h-5"/>}
                        size="lg"
                        className="touch-target-48"
                    >
                        New Note
                    </Button>
                    <Button
                        onClick={onToggleFeatures}
                        variant="ghost"
                        size="lg"
                        leftIcon={<BoltIcon className="w-5 h-5"/>}
                        className="touch-target-48 hidden sm:inline-flex"
                    >
                        Features
                    </Button>
                </div>
            </header>

            {/* Feature Highlights (expandable) */}
            {showFeatures && (
                <section className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6 animate-fade-in-up stagger-1">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-xl text-purple-300">
                            <SparklesIcon className="w-6 h-6"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">What makes Notention different</h3>
                            <p className="text-sm text-gray-400">Powerful features for knowledge capture</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            {icon: BoltIcon, title: 'Semantic Extraction', desc: 'Auto-detect properties from natural language'},
                            {icon: MagicWandIcon, title: 'Smart Matching', desc: 'Discover connections between requests & offers'},
                            {icon: ShieldIcon, title: 'Local-First', desc: 'Your data stays on your device by default'},
                        ].map((feature, i) => (
                            <div key={feature.title} className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 animate-fade-in-up" style={{animationDelay: `${(i + 2) * 50}ms`}}>
                                <div className="p-2 bg-gray-800 rounded-lg text-purple-400 mb-3">
                                    <feature.icon className="w-5 h-5" />
                                </div>
                                <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                                <p className="text-sm text-gray-400">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* First run sample workspace */}
            {showSampleWorkspace && loadSampleWorkspace && (
                <section className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6 animate-slide-in-up stagger-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                        <div className="rounded-2xl bg-purple-500/10 p-3 text-purple-300 flex-shrink-0">
                            <SparklesIcon className="w-7 h-7"/>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-lg font-bold text-white">Try a sample workspace</h3>
                            <p className="text-sm text-gray-400 mt-1">
                                Ten local notes: a request and an offer that match, an event, places, and tasks. Nothing leaves your device.
                            </p>
                        </div>
                        <Button
                            onClick={loadSampleWorkspace}
                            variant="primary"
                            size="md"
                            className="w-full sm:w-auto flex-shrink-0 touch-target-48"
                        >
                            Load sample workspace
                        </Button>
                    </div>
                </section>
            )}
        </>
    );
}