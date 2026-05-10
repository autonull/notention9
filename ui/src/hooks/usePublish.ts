import {useCallback, useState} from 'react';
import {finalizeEvent} from 'nostr-tools';
import {useSettings} from './useSettingsContext.js';
import type {Note} from '@notention/core';
import {DEFAULT_RELAYS, hexToBytes, pool, publishNoteToNostr, networkRegistry} from '@notention/core';
import {getTextFromHtml} from '../utils/html.js';
import {createScopedLogger} from './logging.js';

const log = createScopedLogger('usePublish');

export function usePublish() {
    const {settings} = useSettings() as { settings: any };
    const [isPublishing, setIsPublishing] = useState(false);

    const relays = settings.nostr?.relays || DEFAULT_RELAYS;

    const publishNote = useCallback(async (note: Note, promptUser?: (message: string) => Promise<boolean>) => {
        const hasNip07 = typeof window !== 'undefined' && !!(window as any).nostr;

        setIsPublishing(true);
        let eventId: string | undefined;

        try {
            const content = getTextFromHtml(note.content);
            const formattedContent = `${note.title}\n\n${content}`;

            const noteToPublish = {
                ...note,
                content: formattedContent
            };

            const publishTasks: Promise<any>[] = [];

            // Nostr Publishing
            const nostrEnabled = settings.nostr?.publishEnabled !== false;
            if (nostrEnabled) {
                if (!settings.nostr?.privkey && !hasNip07) {
                    log.warn('Nostr publishing enabled but no key/extension found');
                } else {
                    publishTasks.push((async () => {
                        eventId = await publishNoteToNostr(
                            noteToPublish,
                            settings.nostr?.privkey || undefined,
                            relays,
                            promptUser
                        );
                    })());
                }
            }

            // Meshtastic Publishing
            const meshEnabled = settings.meshtastic?.publishEnabled === true;
            if (meshEnabled) {
                const meshProvider = networkRegistry.getProvider('meshtastic');
                if (meshProvider && meshProvider.enabled) {
                    publishTasks.push(meshProvider.sendNote(noteToPublish));
                }
            }

            if (publishTasks.length === 0) {
                throw new Error('No publishing targets enabled.');
            }

            await Promise.all(publishTasks);

            return eventId || note.id;
        } catch (error) {
            log.error('Failed to publish note', error as Error);
            throw error;
        } finally {
            setIsPublishing(false);
        }
    }, [settings.nostr, settings.meshtastic, relays]);

    const publishProfile = useCallback(async (metadata: { name: string; about: string; picture: string }) => {
        if (!settings.nostr?.privkey) {
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
    }, [settings.nostr?.privkey, relays]);

    return {publishNote, publishProfile, isPublishing};
};
