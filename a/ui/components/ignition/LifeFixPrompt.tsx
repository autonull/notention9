import React, { useState, useEffect } from 'react';
import { LifeDecomposer, ProposedThought } from '@notention/core';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { SparklesIcon, CheckIcon, XIcon, ArrowRightIcon } from '../common/icons';
import { useNotes } from '../../hooks/useNotes';
import { useGardener } from '../../hooks/useGardener';

export function LifeFixPrompt() {
  const [input, setInput] = useState('');
  const [proposedThoughts, setProposedThoughts] = useState<ProposedThought[]>([]);
  const [acceptedThoughts, setAcceptedThoughts] = useState<ProposedThought[]>([]);
  const [stage, setStage] = useState<'prompt' | 'selection' | 'demo'>('prompt');
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [demoLog, setDemoLog] = useState<string[]>([]);
  const [isDemoRunning, setIsDemoRunning] = useState(false);

  const { addNote } = useNotes();
  const { provider } = useGardener();

  // We instantiate LifeDecomposer here.
  // In a more complex setup, this might be provided via context or dependency injection.
  const decomposer = new LifeDecomposer(provider);

  const handleDecompose = async () => {
    if (!input.trim()) return;
    setIsDecomposing(true);

    try {
        const thoughts = await decomposer.decomposeWithAI(input);
        setProposedThoughts(thoughts);
        setStage('selection');
    } catch (e) {
        console.error(e);
    } finally {
        setIsDecomposing(false);
    }
  };

  const handleAccept = (thought: ProposedThought) => {
    setAcceptedThoughts(prev => [...prev, thought]);
    setProposedThoughts(prev => prev.filter(t => t !== thought));
  };

  const handleSkip = (thought: ProposedThought) => {
    setProposedThoughts(prev => prev.filter(t => t !== thought));
  };

  const handleFinishSelection = () => {
      // Move to demo stage without creating notes yet (to keep the Prompt visible)
      setStage('demo');
  };

  const commitAndExit = () => {
      // Create notes for accepted thoughts
      for (const t of acceptedThoughts) {
           addNote({
               title: t.content,
               content: `<p>${t.content}</p><p><i>Ontology: ${t.ontology}</i></p>`,
               properties: [{ key: 'ontology', operator: '=', values: [t.ontology] }]
           });
      }
      // Reload to force dashboard view transition (since notes will exist)
      window.location.reload();
  };

  const handleStartDemo = () => {
      if (isDemoRunning) return;
      setIsDemoRunning(true);
      setDemoLog(['> Initializing demonstration mode... Done', '> Target: ' + acceptedThoughts[0]?.ontology]);
  };

  useEffect(() => {
      if (!isDemoRunning) return;

      const steps = [
          '> Action: Search & Summarize',
          '> Agent: "Searching for solutions regarding ' + (acceptedThoughts[0]?.ontology || 'unknown') + '..."',
          '> Agent: "Found 3 potential strategies."',
          '> Agent: "Drafting action plan..."',
          '> Simulation complete. No side effects applied.',
          '> Ready for manual override.'
      ];

      let i = 0;
      const interval = setInterval(() => {
          if (i >= steps.length) {
              clearInterval(interval);
              setIsDemoRunning(false);
              return;
          }
          setDemoLog(prev => [...prev, steps[i]]);
          i++;
      }, 1500);

      return () => clearInterval(interval);
  }, [isDemoRunning, acceptedThoughts]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-2xl mx-auto px-4 animate-fade-in">

      {stage === 'prompt' && (
        <div className="w-full space-y-8 text-center">
            <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-tighter mb-4 select-none">
                fix my life.
            </h1>
            <p className="text-xl text-gray-400 font-light mb-8">
                Type exactly that. Or your own version. We start where you are.
            </p>

            <div className="relative group max-w-xl mx-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative">
                    <Textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleDecompose();
                            }
                        }}
                        placeholder="e.g., 'I am overwhelmed by debt and my sleep schedule is broken'"
                        className="w-full bg-gray-900 border-gray-700 text-lg p-6 shadow-2xl min-h-[120px] resize-none focus:ring-2 focus:ring-purple-500 rounded-xl"
                    />
                    <div className="absolute bottom-4 right-4">
                        <Button
                            variant="primary"
                            onClick={handleDecompose}
                            isLoading={isDecomposing}
                            disabled={!input.trim()}
                            className="rounded-full px-6 bg-white text-black hover:bg-gray-200 border-none font-bold"
                            icon={SparklesIcon}
                        >
                            Decompose
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {stage === 'selection' && (
        <div className="w-full space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-200">Decomposing Chaos...</h2>
                <p className="text-gray-400">Select the thoughts you want to own.</p>
            </div>

            <div className="grid gap-4">
                {proposedThoughts.map((thought, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl border border-gray-700 hover:border-purple-500/50 transition-all group">
                        <div className="flex-1">
                            <p className="text-lg text-gray-200 font-medium">{thought.content}</p>
                            <span className="text-xs text-purple-400 font-mono mt-1 block opacity-50 group-hover:opacity-100">{thought.ontology}</span>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                            <Button size="sm" variant="ghost" onClick={() => handleSkip(thought)} className="text-gray-500 hover:text-gray-300 hover:bg-gray-800">
                                Skip
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => handleAccept(thought)} icon={CheckIcon} className="bg-purple-600 hover:bg-purple-500">
                                Accept
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {proposedThoughts.length === 0 && acceptedThoughts.length > 0 && (
                 <div className="text-center mt-12 animate-fade-in space-y-6">
                    <div className="inline-block p-4 rounded-full bg-green-900/20 border border-green-500/30">
                        <CheckIcon className="w-8 h-8 text-green-500" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white">Sovereignty Claimed</h3>
                        <p className="text-gray-400 mt-2">You accepted {acceptedThoughts.length} thoughts.</p>
                    </div>
                    <Button size="lg" variant="primary" onClick={handleFinishSelection} icon={ArrowRightIcon} className="w-full max-w-sm mx-auto bg-white text-black hover:bg-gray-200 font-bold">
                        Initialize Action
                    </Button>
                 </div>
            )}
             {proposedThoughts.length === 0 && acceptedThoughts.length === 0 && (
                 <div className="text-center mt-8 space-y-4">
                    <p className="text-gray-400">No thoughts accepted.</p>
                    <Button variant="ghost" onClick={() => setStage('prompt')}>Try Again</Button>
                 </div>
            )}
        </div>
      )}

      {stage === 'demo' && (
        <div className="w-full max-w-3xl text-center space-y-8 animate-fade-in-up">
            <div className="bg-gray-900 border border-purple-500/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                 <div className="flex justify-center mb-6">
                    <div className="p-3 bg-purple-900/30 rounded-xl">
                        <SparklesIcon className="w-12 h-12 text-purple-400" />
                    </div>
                 </div>

                 <h2 className="text-3xl font-bold text-white mb-4">VoltAgent is Ready.</h2>
                 <p className="text-lg text-gray-300 mb-8 max-w-lg mx-auto leading-relaxed">
                     I can demonstrate researching solutions for <span className="text-white font-semibold">"{acceptedThoughts[0]?.content}"</span> right now.
                 </p>

                 <div className="bg-black/80 rounded-xl p-6 mb-8 text-left font-mono text-sm text-green-400 border border-gray-800 shadow-inner min-h-[200px]">
                     <p className="mb-2 opacity-75">{'// Sovereignty Log'}</p>
                     {demoLog.length === 0 && (
                         <>
                             <p>{'>'} Initializing demonstration mode... <span className="text-green-500">Done</span></p>
                             <p>{'>'} Target: {acceptedThoughts[0]?.ontology}</p>
                             <p>{'>'} Action: Search & Summarize</p>
                             <p className="mt-4 animate-pulse text-yellow-400">{'>'} Waiting for pilot authorization...</p>
                         </>
                     )}
                     {demoLog.map((log, i) => (
                         <p key={i} className="animate-fade-in">{log}</p>
                     ))}
                     {isDemoRunning && <p className="animate-pulse text-purple-400">{'>'} ...</p>}
                 </div>

                 <div className="flex flex-col md:flex-row gap-4 justify-center">
                     <Button
                        size="lg"
                        variant="primary"
                        className="bg-white text-black hover:bg-gray-200 font-bold px-8"
                        onClick={handleStartDemo}
                        disabled={isDemoRunning}
                     >
                        {isDemoRunning ? 'Running Demo...' : 'Watch Demo (No Side Effects)'}
                     </Button>
                     <Button size="lg" variant="ghost" onClick={commitAndExit} className="hover:bg-gray-800">
                        Enter Manual Mode
                     </Button>
                 </div>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Sovereignty Preserved</p>
        </div>
      )}
    </div>
  );
}
