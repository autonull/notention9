import React, {useEffect} from 'react';
import {useChatView} from '../../hooks/useChatView';
import {useView} from '../../hooks/useViewContext';
import {ChatWindow} from '../chat/ChatWindow';
import {ContactList} from '../chat/ContactList';
import {ConnectIdentityPrompt} from '../network/ConnectIdentityPrompt';

interface ChatPanelProps {
    initialPubkey?: string | null;
    className?: string;
}

export function ChatPanel({initialPubkey, className}: ChatPanelProps) {
    const {setActiveView, setSelectedChatPubkey} = useView();
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

    useEffect(() => {
        if (initialPubkey && initialPubkey !== localSelectedContact?.pubkey) {
            setSelectedChatPubkey(initialPubkey);
        }
    }, [initialPubkey, localSelectedContact?.pubkey, setSelectedChatPubkey]);

    if (!privkey || !pubkey) {
        return (
            <div className={className}>
                <div className="px-3">
                    <ConnectIdentityPrompt onNavigateToSettings={() => setActiveView('settings')}/>
                </div>
                <p className="px-4 py-6 text-center text-[11px] leading-5 text-[var(--app-faint)]">
                    Add an identity to send encrypted messages. Your key stays on this device.
                </p>
            </div>
        );
    }

    if (localSelectedContact) {
        const displayMessages = messages[localSelectedContact.pubkey] ?? [];
        return (
            <div className={className}>
                <ChatWindow
                    privkey={privkey}
                    pubkey={pubkey}
                    selectedContact={localSelectedContact}
                    onBack={() => handleSelectContact(null)}
                    messages={displayMessages}
                    isLoading={isLoading}
                    onSendMessage={addMessage}
                    onOpenSettings={() => setActiveView('settings')}
                />
            </div>
        );
    }

    return (
        <div className={className}>
            <ContactList
                privkey={privkey}
                pubkey={pubkey}
                contacts={contacts}
                onAddContact={addContact}
                selectedContact={null}
                onSelectContact={handleSelectContact}
                isLoading={isLoading}
            />
        </div>
    );
}
