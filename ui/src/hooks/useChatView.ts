import {useEffect, useMemo, useState} from 'react';
import {getPublicKey} from 'nostr-tools';
import type {Contact} from '@notention/core';
import {hexToBytes} from '@notention/core';
import {useSettings} from './useSettingsContext';
import {useView} from './useViewContext';
import {useChat} from './useChat';

export const useChatView = () => {
    const {settings} = useSettings();
    const {selectedChatPubkey, setSelectedChatPubkey} = useView();

    const privkey = settings.nostr.privkey;
    const pubkey = useMemo(
        () => (privkey ? getPublicKey(hexToBytes(privkey)) : null),
        [privkey]
    );

    // Sync selected contact with ViewContext
    const [localSelectedContact, setLocalSelectedContact] = useState<Contact | null>(null);

    useEffect(() => {
        if (selectedChatPubkey) {
            setLocalSelectedContact({pubkey: selectedChatPubkey});
        } else {
            setLocalSelectedContact(null);
        }
    }, [selectedChatPubkey]);

    const handleSelectContact = (contact: Contact | null) => {
        setSelectedChatPubkey(contact ? contact.pubkey : null);
    };

    const {
        contacts,
        setContacts,
        messages,
        isLoading,
        addMessage
    } = useChat({privkey, pubkey, selectedContact: localSelectedContact});

    return {
        privkey,
        pubkey,
        localSelectedContact,
        contacts,
        setContacts,
        messages,
        isLoading,
        addMessage,
        handleSelectContact
    };
};
