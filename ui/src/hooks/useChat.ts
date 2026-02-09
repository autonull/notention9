import {useCallback, useEffect, useState} from 'react';
import {nip04} from 'nostr-tools';
import type {Contact, NostrEvent} from '@notention/core';
import {DEFAULT_RELAYS, pool} from '@notention/core';

interface UseChatProps {
    privkey: string | null;
    pubkey: string | null;
    selectedContact: Contact | null;
}

export const useChat = ({privkey, pubkey, selectedContact}: UseChatProps) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [messages, setMessages] = useState<
        Record<string, (NostrEvent & { content: string })[]>
    >({});
    const [isLoading, setIsLoading] = useState(true);

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

    // Fetch initial contact list (kind: 3)
    useEffect(() => {
        if (!pubkey) {
            setIsLoading(false);
            return;
        }

        const sub = pool.subscribeMany(
            DEFAULT_RELAYS,
            {kinds: [3], authors: [pubkey], limit: 1},
            {
                onevent: (event) => {
                    const newContacts: Contact[] = event.tags
                        .filter((tag) => tag[0] === 'p' && tag[1])
                        .map((tag) => ({pubkey: tag[1]}));
                    setContacts(newContacts);
                    setIsLoading(false);
                },
                onclose: () => setIsLoading(false),
            }
        );

        const timer = setTimeout(() => {
            // Stop loading spinner even if no kind 3 found
            setIsLoading(false);
        }, 3000);

        return () => {
            clearTimeout(timer);
            sub.close();
        };
    }, [pubkey]);

    // Subscribe to messages for the selected contact
    useEffect(() => {
        if (!selectedContact || !pubkey || !privkey) return;

        const sub = pool.subscribeMany(
            DEFAULT_RELAYS,
            {
                kinds: [4],
                authors: [pubkey, selectedContact.pubkey],
                '#p': [pubkey, selectedContact.pubkey]
            },
            {onevent: handleDecryption}
        );

        return () => sub.close();
    }, [selectedContact, pubkey, privkey, handleDecryption]);

    return {
        contacts,
        setContacts,
        messages,
        isLoading,
        addMessage,
    };
};
