import React, {useEffect} from 'react';
import {useChatView} from '../../hooks/useChatView';
import {useView} from '../../hooks/useViewContext';
import {ChatWindow} from '../chat/ChatWindow';
import {ContactList} from '../chat/ContactList';
import {ConnectIdentityPrompt} from '../network/ConnectIdentityPrompt';
import {KeyIcon} from '../ui/icons';

export function ChatView() {
    const {resetChatNotification, setActiveView} = useView();

    // Clear notifications when entering chat view
    useEffect(() => {
        resetChatNotification();
    }, [resetChatNotification]);

    const {
        privkey,
        pubkey,
        localSelectedContact,
        contacts,
        addContact,
        messages,
        isLoading,
        addMessage,
        handleSelectContact,
    } = useChatView();


    // Resolve full contact object
    const fullSelectedContact = localSelectedContact
        ? contacts.find(c => c.pubkey === localSelectedContact.pubkey) || localSelectedContact
        : null;

    // Determine messages to display
    const displayMessages = fullSelectedContact ? messages[fullSelectedContact.pubkey] || [] : [];

    const onNavigateToSettings = () => setActiveView('settings');

    return (
        <div className="flex h-full bg-gray-800/50 rounded-lg overflow-hidden">
            {!privkey || !pubkey ? (
                // No identity: compact banner + read-only contact list
                <>
                    <div className="w-full md:w-1/3 md:flex-shrink-0 flex flex-col h-full">
                        <ConnectIdentityPrompt compact onNavigateToSettings={onNavigateToSettings} />
                        <div className="p-4 border-b border-gray-700/50">
                            <h2 className="text-lg font-bold text-white flex justify-between items-center">
                                Chats (read-only)
                            </h2>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4">
                            <ContactList
                                privkey={pubkey || ''}
                                pubkey={pubkey || ''}
                                contacts={contacts}
                                onAddContact={async () => {}}
                                selectedContact={null}
                                onSelectContact={() => {}}
                                isLoading={isLoading}
                            />
                        </div>
                    </div>
                    <div className="w-full flex flex-col bg-gray-900/50 p-8">
                        <div className="text-center text-gray-500 max-w-md mx-auto">
                            <KeyIcon className="h-12 w-12 text-gray-600 mx-auto mb-4"/>
                            <h3 className="text-lg font-semibold text-gray-300 mb-2">Add an identity to chat</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Messages are encrypted end to end and signed by your key.
                                Add a Nostr identity in Settings to start a conversation.
                            </p>
                            <button
                                onClick={onNavigateToSettings}
                                data-variant="primary"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
                            >
                                Go to Settings
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                // Has identity: normal chat view
                <>
                    <div
                        className={`w-full md:w-1/3 md:flex-shrink-0 ${fullSelectedContact ? 'hidden md:block' : 'block'}`}
                    >
                        <ContactList
                            privkey={privkey}
                            pubkey={pubkey}
                            contacts={contacts}
                            onAddContact={addContact}
                            selectedContact={fullSelectedContact}
                            onSelectContact={handleSelectContact}
                            isLoading={isLoading}
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
                            isLoading={isLoading}
                            onSendMessage={async (peerPubkey, event, decryptedContent) => {
                                addMessage(peerPubkey, event, decryptedContent);
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
