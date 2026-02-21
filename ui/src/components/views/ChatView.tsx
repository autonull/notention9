import React, {useEffect} from 'react';
import {useChatView} from '../../hooks/useChatView';
import {useView} from '../../hooks/useViewContext';
import {ChatWindow} from '../chat/ChatWindow';
import {ContactList} from '../chat/ContactList';

export function ChatView() {
    const {resetChatNotification} = useView();

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
                    onSendMessage={async (peerPubkey, event, decryptedContent) => {
                        addMessage(peerPubkey, event, decryptedContent);
                    }}
                />
            </div>
        </div>
    );
}
