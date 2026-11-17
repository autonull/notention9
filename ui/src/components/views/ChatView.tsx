import React, {useEffect} from 'react';
import {useChatView} from '../../hooks/useChatView';
import {useView} from '../../hooks/useViewContext';
import {ChatWindow} from '../chat/ChatWindow';
import {ContactList} from '../chat/ContactList';
import {EmptyState} from '../ui/Primitives';
import {Button} from '../ui/Button';
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

    if (!privkey || !pubkey) {
        return (
            <EmptyState
                icon={KeyIcon}
                title="Chat needs an identity"
                description="Messages are encrypted end to end and signed by your key. Add an identity to start a conversation."
                action={<Button variant="primary" onClick={() => setActiveView('settings')}>Set up identity</Button>}
            />
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
                    isLoading={isLoading}
                    onSendMessage={async (peerPubkey, event, decryptedContent) => {
                        addMessage(peerPubkey, event, decryptedContent);
                    }}
                />
            </div>
        </div>
    );
}
