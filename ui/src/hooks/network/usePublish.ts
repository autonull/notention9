import {useCallback, useState} from 'react';
import {finalizeEvent} from 'nostr-tools';
import {useSettings} from '../index.js';
import type {Note} from '@notention/core';
import {DEFAULT_RELAYS, hexToBytes, pool, publishNoteToNostr} from '@notention/core';
import {getTextFromHtml} from '../../utils/html.js';
import {createScopedLogger} from '../logging.js';

const log = createScopedLogger('usePublish');

export function usePublish() {
    const {settings} = useSettings();
    const [isPublishing, setIsPublishing] = useState(false);

    const relays = settings.nostr.relays || DEFAULT_RELAYS;

    const publishNote = useCallback(async (note: Note, promptUser?: (message: string) => Promise<boolean>) => {
        const hasNip07 = typeof window !== 'undefined' && !!(window as any).nostr;

        if (!settings.nostr.privkey && !hasNip07) {
            throw new Error('No private key found in settings and no NIP-07 extension detected. Please configure your Nostr identity.');
        }

        setIsPublishing(true);
        try {
            const content = getTextFromHtml(note.content);
            const formattedContent = `${note.title}\n\n${content}`;

            const noteToPublish = {
                ...note,
                content: formattedContent
            };

            await publishNoteToNostr(
                noteToPublish,
                settings.nostr.privkey || undefined,
                relays,
                promptUser
            );

            return noteToPublish.nostrEventId;
        } catch (error) {
            log.error('Failed to publish note', error as Error);
            throw error;
        } finally {
            setIsPublishing(false);
        }
    }, [settings.nostr.privkey, relays]);

    const publishProfile = useCallback(async (metadata: { name: string; about: string; picture: string }) => {
        if (!settings.nostr.privkey) {
            throw new Error('No private key found.');
        }

        setIsPublishing(true);
        try {
            const privkeyBytes = hexToBytes(settings.nostr.privkey);
            const created_at = Math.floor(Date.now() / 1000);

            const eventTemplate = {
                kind: 0,
                created_at,
                tags: [],
                content: JSON.stringify(metadata)
            };

            const signedEvent = finalizeEvent(eventTemplate, privkeyBytes);
            const pubs = pool.publish(relays, signedEvent);
            await Promise.any(pubs);

        } catch (error) {
            log.error('Failed to publish profile', error as Error);
            throw error;
        } finally {
            setIsPublishing(false);
        }
    }, [settings.nostr.privkey, relays]);

    return {publishNote, publishProfile, isPublishing};
};
