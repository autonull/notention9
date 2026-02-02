import { useCallback, useState } from 'react';
import { finalizeEvent } from 'nostr-tools';
import { useSettings } from './useSettingsContext';
import { pool, DEFAULT_RELAYS, hexToBytes, NetworkGate, PrivacyError, Logger } from '@notention/core';
import { getTextFromHtml } from '@notention/core';
import type { Note } from '@notention/core';

export const usePublish = () => {
  const { settings } = useSettings();
  const [isPublishing, setIsPublishing] = useState(false);

  const relays = settings.nostr.relays || DEFAULT_RELAYS;
  const networkGate = new NetworkGate();

  const publishNote = useCallback(async (note: Note, promptUser?: (message: string) => Promise<boolean>) => {
    if (!settings.nostr.privkey) {
      throw new Error('No private key found in settings. Please configure your Nostr identity.');
    }

    // Privacy check - prevent publishing private notes
    try {
      const canTransmit = await networkGate.canTransmit(note, 'Nostr network', promptUser);
      if (!canTransmit) {
        throw new Error('Publishing cancelled - note is private');
      }
    } catch (error) {
      if (error instanceof PrivacyError) {
        throw new Error('Cannot publish private note. Enable public sharing first.');
      }
      throw error;
    }

    setIsPublishing(true);
    try {
      const privkeyBytes = hexToBytes(settings.nostr.privkey);
      const content = getTextFromHtml(note.content);

      const tags = note.tags.map(tag => ['t', tag]);

      note.properties.forEach(prop => {
        if (prop.values.length > 0) {
          prop.values.forEach(val => {
            tags.push(['property', prop.key, prop.operator, val]);
          });
        }
      });

      const created_at = Math.floor(Date.now() / 1000);

      const eventTemplate = {
        kind: 1,
        created_at,
        tags,
        content: `${note.title}\n\n${content}`,
      };

      const signedEvent = finalizeEvent(eventTemplate, privkeyBytes);

      const pubs = pool.publish(relays, signedEvent);
      await Promise.any(pubs);

      return signedEvent.id;
    } catch (error) {
      Logger.getInstance().error('Failed to publish note:', error as Error);
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
      Logger.getInstance().error('Failed to publish profile:', error as Error);
      throw error;
    } finally {
      setIsPublishing(false);
    }
  }, [settings.nostr.privkey, relays]);

  return { publishNote, publishProfile, isPublishing };
};
