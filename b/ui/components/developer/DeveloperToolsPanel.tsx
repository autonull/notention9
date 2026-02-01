import React, { useState } from 'react';
import { Note } from '@notention/core';
import { useSettings } from '../../hooks/useSettingsContext';
import { OntologyVisualizer } from './OntologyVisualizer';
import { parseProperties } from '@notention/core';
import { matchNotesWithRealVsImaginary } from '../../utils/matching';

interface DeveloperToolsPanelProps {
  className?: string;
}

export const DeveloperToolsPanel: React.FC<DeveloperToolsPanelProps> = ({ className = '' }) => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'ontology' | 'parser' | 'matcher' | 'debug'>('ontology');
  const [testInput, setTestInput] = useState('[role:is:Developer] [salary > 50000]');
  const [requestNote, setRequestNote] = useState<Note | null>(null);
  const [offerNote, setOfferNote] = useState<Note | null>(null);
  const [matchResult, setMatchResult] = useState<any>(null);

  const parsedProperties = parseProperties(testInput);

  const handleTestMatch = () => {
    if (requestNote && offerNote) {
      const result = matchNotesWithRealVsImaginary(requestNote, offerNote);
      setMatchResult(result);
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
      <div className="flex border-b border-gray-700 mb-4">
        <button
          className={`px-3 py-1 ${activeTab === 'ontology' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('ontology')}
        >
          Ontology
        </button>
        <button
          className={`px-3 py-1 ${activeTab === 'parser' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('parser')}
        >
          Parser
        </button>
        <button
          className={`px-3 py-1 ${activeTab === 'matcher' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('matcher')}
        >
          Matcher
        </button>
        <button
          className={`px-3 py-1 ${activeTab === 'debug' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('debug')}
        >
          Debug
        </button>
      </div>

      {activeTab === 'ontology' && (
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Ontology Graph</h3>
          <p className="text-sm text-gray-400 mb-4">
            View and manage the emergent schema. The Gardener learns from your usage.
          </p>
          <OntologyVisualizer />
        </div>
      )}

      {activeTab === 'parser' && (
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Semantic Parser</h3>
          <p className="text-sm text-gray-400 mb-4">
            Test the parsing of semantic properties from text.
          </p>
          <textarea
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mb-2"
            rows={4}
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter text with semantic properties like [role:is:Developer] or [salary > 50000]"
          />
          <div className="bg-gray-800 p-3 rounded">
            <h4 className="font-medium text-white mb-2">Parsed Properties:</h4>
            <div className="space-y-1">
              {parsedProperties.map((prop, idx) => (
                <div key={idx} className="text-sm font-mono bg-gray-700 p-2 rounded">
                  <span className="text-blue-300">[{prop.key}:{prop.operator}:{prop.values.join(', ')}]</span>
                </div>
              ))}
              {parsedProperties.length === 0 && (
                <div className="text-gray-500 italic">No properties found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'matcher' && (
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Semantic Matcher</h3>
          <p className="text-sm text-gray-400 mb-4">
            Test matching between request and offer notes using real vs imaginary logic.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium text-white mb-2">Request Note (Constraints)</h4>
              <textarea
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mb-2"
                rows={6}
                value={requestNote ? JSON.stringify(requestNote, null, 2) : ''}
                onChange={(e) => setRequestNote(JSON.parse(e.target.value))}
                placeholder='{"title": "Need Developer", "properties": [{"key": "role", "operator": "is", "values": ["Developer"]}], ...}'
              />
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Offer Note (Facts)</h4>
              <textarea
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mb-2"
                rows={6}
                value={offerNote ? JSON.stringify(offerNote, null, 2) : ''}
                onChange={(e) => setOfferNote(JSON.parse(e.target.value))}
                placeholder='{"title": "Available Developer", "properties": [{"key": "role", "operator": "is", "values": ["Developer"]}], ...}'
              />
            </div>
          </div>
          
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-4"
            onClick={handleTestMatch}
          >
            Test Match
          </button>
          
          {matchResult && (
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="font-medium text-white mb-2">Match Result:</h4>
              <pre className="text-sm text-gray-300 bg-gray-700 p-2 rounded overflow-x-auto">
                {JSON.stringify(matchResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'debug' && (
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Debug Information</h3>
          <p className="text-sm text-gray-400 mb-4">
            System information and debugging tools.
          </p>
          <div className="bg-gray-800 p-3 rounded">
            <div className="mb-2">
              <span className="text-gray-400">Developer Mode:</span>{' '}
              <span className="text-green-400">{settings.developerMode ? 'ON' : 'OFF'}</span>
            </div>
            <div className="mb-2">
              <span className="text-gray-400">AI Enabled:</span>{' '}
              <span className="text-green-400">{settings.aiEnabled ? 'YES' : 'NO'}</span>
            </div>
            <div>
              <span className="text-gray-400">Ontology Nodes:</span>{' '}
              <span className="text-blue-400">{settings.ontology.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};