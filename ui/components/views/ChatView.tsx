import React, { useEffect, useState } from 'react';
import { useChatView } from '../../hooks/useChatView';
import { useView } from '../../hooks/useViewContext';
import { ChatWindow } from '../chat/ChatWindow';
import { ContactList } from '../chat/ContactList';
import { useSimulatorContext } from '../../hooks/useSimulatorContext';
import { AgentSettingsModal } from '../simulator/AgentSettingsModal';
import { useNotes } from '../../hooks/useNotes';
import { useGardener } from '../../hooks/useGardener';
import { SELF_AGENT_ID } from '../../hooks/simulator/types';
import type { Contact, NostrEvent } from '@notention/core';
import type { SwarmTemplate } from '../../hooks/simulator/types';

// Helper to create a local message object
const createLocalMessage = (content: string, pubkey: string): NostrEvent => ({
    id: crypto.randomUUID(),
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: 4,
    tags: [],
    content,
    sig: 'local'
});

export function ChatView() {
  const { resetChatNotification } = useView();
  const {
      agents,
      agentMessages,
      sendMessageToAgent,
      addAgent,
      deploySwarm,
      removeAgent,
      updateAgent,
      toggleAgent,
      randomizeAgent,
      clearAgentMessages
  } = useSimulatorContext();
  const { notes } = useNotes();
  const { evolveOntology, optimizeOntology } = useGardener();
  const [systemMessages, setSystemMessages] = useState<NostrEvent[]>([]);

  const [settingsAgentId, setSettingsAgentId] = useState<string | null>(null);

  // Clear notifications when entering chat view
  useEffect(() => {
      resetChatNotification();
  }, [resetChatNotification]);
  const {
    privkey,
    pubkey,
    localSelectedContact,
    contacts,
    setContacts,
    messages,
    isLoading,
    addMessage,
    handleSelectContact,
  } = useChatView();

  const handleDeploySwarm = (template: SwarmTemplate) => {
      const newAgents = template.agents.map(a => ({
          ...a,
          id: crypto.randomUUID(),
          status: 'Idle',
          currentDraft: '',
          isAgent: true,
          enabled: true
      }));
      deploySwarm(newAgents);
  };

  // Merge Agent Contacts
  const agentContacts: Contact[] = agents.map(a => ({
      pubkey: a.id,
      name: a.name,
      about: a.bio,
      picture: a.avatar,
      isAgent: true
  }));

  const allContacts = [...agentContacts, ...contacts];

  // Resolve full contact object
  const fullSelectedContact = localSelectedContact
      ? allContacts.find(c => c.pubkey === localSelectedContact.pubkey) || localSelectedContact
      : null;

  // Determine messages to display
  // We need to merge local system messages if we are chatting with Assistant
  let displayMessages: NostrEvent[] = [];

  if (fullSelectedContact?.isAgent) {
      displayMessages = [...(agentMessages[fullSelectedContact.pubkey] || [])];
      if (fullSelectedContact.pubkey === SELF_AGENT_ID) {
          // Merge in any local system overrides if we implement that
          displayMessages = [...displayMessages, ...systemMessages].sort((a,b) => a.created_at - b.created_at);
      }
  } else {
      displayMessages = fullSelectedContact ? messages[fullSelectedContact.pubkey] || [] : [];
  }

  const selectedAgent = settingsAgentId ? agents.find(a => a.id === settingsAgentId) : null;

  if (!privkey || !pubkey) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center bg-gray-800/50 rounded-lg p-8">
        <h2 className="text-3xl font-bold text-gray-400">
          Chat Requires Nostr Account
        </h2>
        <p className="text-gray-500 mt-2">
          Please create or configure your Nostr account in the
          &quot;Network&quot; tab.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-800/50 rounded-lg overflow-hidden">
      <div
        className={`w-full md:w-1/3 md:flex-shrink-0 ${fullSelectedContact ? 'hidden md:block' : 'block'}`}
      >
        <ContactList
          privkey={privkey}
          pubkey={pubkey}
          contacts={allContacts}
          setContacts={setContacts}
          selectedContact={fullSelectedContact}
          onSelectContact={handleSelectContact}
          isLoading={isLoading}
          onAddAgent={addAgent}
          onDeploySwarm={handleDeploySwarm}
        />
      </div>
      <div
        className={`w-full ${!fullSelectedContact ? 'hidden md:block' : 'block'}`}
      >
        <ChatWindow
          privkey={privkey}
          pubkey={pubkey}
          selectedContact={fullSelectedContact}
          onBack={() => handleSelectContact(null)}
          messages={displayMessages}
          onSendMessage={async (peerPubkey, event, decryptedContent) => {
            if (peerPubkey === SELF_AGENT_ID) {
                const lower = decryptedContent.toLowerCase();
                // Check for commands
                if (lower.includes('analyze') || lower.includes('evolve') || lower.includes('scan') || lower.includes('optimize') || lower.includes('update ontology') || lower.includes('help')) {
                    // 1. Add User Message Locally
                    if (pubkey) {
                        setSystemMessages(prev => [...prev, createLocalMessage(decryptedContent, pubkey)]);
                    }

                    // 2. Process Command
                    if (lower.includes('help')) {
                         setTimeout(() => {
                             setSystemMessages(prev => [...prev, createLocalMessage("I can help you organize your notes. Try 'Scan notes' or 'Update ontology'.", SELF_AGENT_ID)]);
                         }, 500);
                    } else if (lower.includes('analyze') || lower.includes('evolve') || lower.includes('scan')) {
                         setSystemMessages(prev => [...prev, createLocalMessage("Scanning your notes...", SELF_AGENT_ID)]);
                         const newAttrs = await evolveOntology(notes);
                         const response = newAttrs.length > 0
                            ? `I found ${newAttrs.length} new properties: ${newAttrs.map(a => a.key).join(', ')}.`
                            : "Your notes look consistent. I didn't find any new patterns.";
                         setSystemMessages(prev => [...prev, createLocalMessage(response, SELF_AGENT_ID)]);
                    } else if (lower.includes('optimize') || lower.includes('update ontology')) {
                         setSystemMessages(prev => [...prev, createLocalMessage("Optimizing ontology...", SELF_AGENT_ID)]);
                         const res = await optimizeOntology();
                         const response = `Optimization complete. ${res.merged.length} merges proposed.`;
                         setSystemMessages(prev => [...prev, createLocalMessage(response, SELF_AGENT_ID)]);
                    }
                } else {
                    // Normal Chat -> Send to Simulator
                    sendMessageToAgent(peerPubkey, decryptedContent);
                }
            } else if (fullSelectedContact?.isAgent) {
                sendMessageToAgent(peerPubkey, decryptedContent);
            } else {
                addMessage(peerPubkey, event, decryptedContent);
            }
          }}
          onOpenSettings={fullSelectedContact?.isAgent ? () => setSettingsAgentId(fullSelectedContact.pubkey) : undefined}
          onClearChat={
              fullSelectedContact?.isAgent
                ? () => {
                    clearAgentMessages(fullSelectedContact.pubkey);
                    if (fullSelectedContact.pubkey === SELF_AGENT_ID) {
                        setSystemMessages([]);
                    }
                }
                : undefined
          }
        />
      </div>

      {selectedAgent && (
          <AgentSettingsModal
              isOpen={!!selectedAgent}
              onClose={() => setSettingsAgentId(null)}
              agent={selectedAgent}
              onUpdate={(updates) => updateAgent(agents.findIndex(a => a.id === selectedAgent.id), updates)}
              onDelete={() => removeAgent(selectedAgent.id)}
              onToggle={() => toggleAgent(selectedAgent.id)}
              onRandomize={() => randomizeAgent(agents.findIndex(a => a.id === selectedAgent.id))}
          />
      )}
    </div>
  );
}
