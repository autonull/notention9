import {useCallback, useEffect, useMemo, useState} from 'react';
import {nip04} from 'nostr-tools';
import type {Contact, NostrEvent} from '@notention/core';
import {pool, resolveRelays} from '@notention/core';
import { useContacts } from './useContacts';
import { useSettings } from './useSettingsContext';

interface UseChatProps {
    privkey: string | null;
    pubkey: string | null;
    selectedContact: Contact | null;
}

export function useChat({privkey, pubkey, selectedContact}: UseChatProps) {
    const { contacts, isLoading: contactsLoading, addContact } = useContacts();
    const { settings } = useSettings();
    const relays = useMemo(() => resolveRelays(settings.nostr.relays), [settings.nostr.relays]);

    const [messages, setMessages] = useState<
        Record<string, (NostrEvent & { content: string })[]>
    >({});

    const addMessage = useCallback(
        (peerPubkey: string, event: NostrEvent, decryptedContent: string) => {
            setMessages((prev) => {
                const existing = prev[peerPubkey] || [];
                if (existing.some((m) => m.id === event.id)) return prev;
                const newMessages = [
                    ...existing,
                    {...event, content: decryptedContent},
                ];
                newMessages.sort((a, b) => a.created_at - b.created_at);
                return {...prev, [peerPubkey]: newMessages.slice(-100)};
            });
        },
        []
    );

    const handleDecryption = useCallback(
        async (event: NostrEvent) => {
            if (!privkey || !pubkey) return;
            try {
                const peerPubkey =
                    event.pubkey === pubkey
                        ? event.tags.find((t) => t[0] === 'p')?.[1]
                        : event.pubkey;
                if (!peerPubkey) return;

                const decryptedContent = await nip04.decrypt(
                    privkey,
                    peerPubkey,
                    event.content
                );
                addMessage(peerPubkey, event, decryptedContent);
            } catch {
                // Suppress errors
            }
        },
        [privkey, pubkey, addMessage]
    );

    // Subscribe to messages for the selected contact
    useEffect(() => {
        if (!selectedContact || !pubkey || !privkey) return;

        const sub = pool.subscribeMany(
            relays,
            {
                kinds: [4],
                authors: [pubkey, selectedContact.pubkey],
                '#p': [pubkey, selectedContact.pubkey]
            },
            {onevent: handleDecryption}
        );

        return () => sub.close();
    }, [selectedContact, pubkey, privkey, handleDecryption, relays]);

    return {
        contacts,
        addContact,
        messages,
        isLoading: contactsLoading,
        addMessage,
    };
};
