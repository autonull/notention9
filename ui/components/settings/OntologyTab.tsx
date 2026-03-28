import React from 'react';
import { useSettings } from '../../hooks/useSettingsContext';
import { DeveloperToolsPanel } from '../developer/DeveloperToolsPanel';

export function OntologyTab() {
  const { settings, setSettings } = useSettings();

  const handleAddNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      label: 'New Concept',
      description: 'Description of the concept',
      attributes: {}
    };
    
    setSettings(prev => ({
      ...prev,
      ontology: [...prev.ontology, newNode]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900/50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Ontology Graph</h3>
          <button 
            onClick={handleAddNode}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            Add Node
          </button>
        </div>
        <p className="text-gray-400 mb-4">
          Define the schema for your semantic network. The Gardener evolves this based on usage.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-white mb-2">Current Ontology</h4>
            <div className="bg-gray-800 p-4 rounded">
              <p className="text-gray-400 text-sm">
                {settings.ontology.length} nodes in your ontology
              </p>
              <div className="mt-2 max-h-60 overflow-y-auto">
                {settings.ontology.map((node, index) => (
                  <div key={node.id} className="py-2 border-b border-gray-700 last:border-0">
                    <div className="font-medium text-blue-300">{node.label}</div>
                    <div className="text-xs text-gray-500">{node.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-2">Developer Tools</h4>
            <p className="text-gray-400 text-sm mb-3">
              Advanced tools for ontology management and debugging
            </p>
            <DeveloperToolsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}