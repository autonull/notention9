import { useEffect, useRef } from 'react';
import { useSettings } from './useSettingsContext';
import { useView } from './useViewContext';
import { DEFAULT_RELAYS, pool, hexToBytes, Logger } from '@notention/core';
import { getPublicKey } from 'nostr-tools';

export const useChatNotifications = () => {
    const { settings } = useSettings();
    const { incrementChatNotification, activeView } = useView();
    const seenEvents = useRef(new Set<string>());

    useEffect(() => {
        const privkey = settings.nostr.privkey;
        if (!privkey) return;

        let pubkey = '';
        try {
            pubkey = getPublicKey(hexToBytes(privkey));
        } catch (e: unknown) {
            const logger = Logger.getInstance();
            logger.error('Invalid privkey for chat notifications', e instanceof Error ? e : new Error(String(e)));
            return;
        }

        const relays = settings.nostr.relays || DEFAULT_RELAYS;

        // Subscribe to DMs received since now (or maybe slight overlap to be safe)
        const since = Math.floor(Date.now() / 1000);

        const sub = pool.subscribeMany(
            relays,
            { kinds: [4], '#p': [pubkey], since },
            {
                onevent: (event) => {
                    if (seenEvents.current.has(event.id)) return;
                    seenEvents.current.add(event.id);

                    // Don't increment if we are already in the chat view?
                    // Actually, if we are in chat view, we might still want to know?
                    // Let's increment regardless, but reset when entering chat view is handled by ChatView.tsx
                    // Wait, if I am chatting with Bob, and Alice messages me, I want a notification.
                    // But if Bob messages me, and I am looking at Bob's chat, I don't want a badge increment.
                    // This logic is complex to implement perfectly without checking selectedChatPubkey.
                    // For now, let's simple increment. ChatView clears on mount/selection.

                    if (activeView !== 'chat') {
                         incrementChatNotification();
                    }
                }
            }
        );

        return () => {
            sub.close();
        };

    }, [settings.nostr.privkey, settings.nostr.relays, incrementChatNotification, activeView]);
};
