import React, { useState } from 'react';
import { SwarmModal } from '../simulator/SwarmModal';
import { SimulatorSidebar } from '../simulator/SimulatorSidebar';
import { SimulatorOverview } from '../simulator/SimulatorOverview';
import { SimulatorAgentView } from '../simulator/SimulatorAgentView';
import { useSimulatorContext } from '../../hooks/useSimulatorContext';
import { useSwarmActions } from '../../hooks/simulator/useSwarmActions';

export function SimulatorView() {
  const {
      agents,
      updateAgent,
      active,
      setActive,
      logs,
      networkNotes,
      ontology,
      notifications,
      newAttributes,
      aiProviderName,
      handlePublish,
      randomizeAgent,
      addAgent,
      optimizeOntology,
      importUserNotes,
      saveNetworkNote
  } = useSimulatorContext();
  const { handleDeploySwarm } = useSwarmActions();

  const [selectedView, setSelectedView] = useState<'overview' | string>('overview');
  const [showSwarmModal, setShowSwarmModal] = useState(false);

  const selectedAgentIndex = agents.findIndex(a => a.id === selectedView);
  const selectedAgent = selectedAgentIndex !== -1 ? agents[selectedAgentIndex] : null;

  return (
    <div className="flex h-full bg-black text-gray-200 overflow-hidden relative">
      <SimulatorSidebar
          aiProviderName={aiProviderName}
          active={active}
          setActive={setActive}
          importUserNotes={importUserNotes}
          selectedView={selectedView}
          setSelectedView={setSelectedView}
          addAgent={addAgent}
          onOpenSwarmModal={() => setShowSwarmModal(true)}
          agents={agents}
          notifications={notifications}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden bg-gray-950 p-2">
          {selectedView === 'overview' ? (
              <SimulatorOverview
                  networkNotes={networkNotes}
                  onSaveNote={saveNetworkNote}
                  logs={logs}
                  optimizeOntology={optimizeOntology}
                  newAttributes={newAttributes}
              />
          ) : selectedAgent && (
              <SimulatorAgentView
                  agent={selectedAgent}
                  isActive={active}
                  onUpdateAgent={(updates) => updateAgent(selectedAgentIndex, updates)}
                  onRandomizeAgent={() => randomizeAgent(selectedAgentIndex)}
                  onPublish={handlePublish}
                  notifications={(notifications[selectedAgent.id] as string[]) || []}
                  ontology={ontology}
              />
          )}
      </div>

      <SwarmModal
        isOpen={showSwarmModal}
        onClose={() => setShowSwarmModal(false)}
        onDeploy={(template) => handleDeploySwarm(template, () => setShowSwarmModal(false))}
      />
    </div>
  );
};
