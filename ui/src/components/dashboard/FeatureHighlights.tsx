import React from 'react';
import {BoltIcon, MagicWandIcon, ShieldIcon} from '../common/icons';

const FEATURE_HIGHLIGHTS = [
    {icon: BoltIcon, title: 'Semantic Extraction', desc: 'Auto-detect properties from natural language'},
    {icon: MagicWandIcon, title: 'Smart Matching', desc: 'Discover connections between requests & offers'},
    {icon: ShieldIcon, title: 'Local-First', desc: 'Your data stays on your device by default'},
];

export function FeatureHighlights() {
    return (
        <section className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6 animate-fade-in-up stagger-1">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-300">
                    <BoltIcon className="w-6 h-6"/>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">What makes Notention different</h3>
                    <p className="text-sm text-gray-400">Powerful features for knowledge capture</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {FEATURE_HIGHLIGHTS.map((feature, i) => (
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
    );
}