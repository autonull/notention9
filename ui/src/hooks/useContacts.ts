import { useState, useEffect, useCallback } from 'react';
import { getPublicKey } from 'nostr-tools';
import { Contact, DEFAULT_RELAYS, hexToBytes, pool } from '@notention/core';
import { useSettings } from './useSettingsContext';
import { nostrService } from '../services/NostrService';

export const useContacts = () => {
    const { settings } = useSettings();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const privkey = settings.nostr.privkey;
    const pubkey = privkey ? getPublicKey(hexToBytes(privkey)) : null;

    useEffect(() => {
        if (!pubkey) {
            setIsLoading(false);
            return;
        }

        const sub = pool.subscribeMany(
            DEFAULT_RELAYS,
            { kinds: [3], authors: [pubkey], limit: 1 },
            {
                onevent: (event) => {
                    const newContacts: Contact[] = event.tags
                        .filter((tag) => tag[0] === 'p' && tag[1])
                        .map((tag) => ({ pubkey: tag[1] }));
                    setContacts(newContacts);
                    setIsLoading(false);
                },
                onclose: () => setIsLoading(false),
            }
        );

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        return () => {
            clearTimeout(timer);
            sub.close();
        };
    }, [pubkey]);

    const addContact = useCallback(async (newPubkey: string) => {
        await nostrService.addContact(newPubkey);
        // Optimistic update or refetch could happen here
        // For now, the subscription should pick up the new event if published to same relays
        // But pool.publish doesn't always trigger local subscribe immediately unless relayed back.
        // We can optimistically append.
        setContacts(prev => {
            if (prev.some(c => c.pubkey === newPubkey)) return prev;
            return [...prev, { pubkey: newPubkey }];
        });
    }, []);

    return {
        contacts,
        isLoading,
        addContact,
        pubkey // Expose pubkey for convenience
    };
};
