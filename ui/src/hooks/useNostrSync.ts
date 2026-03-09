import {useEffect} from 'react';
import {useNotes} from './useNotes';
import {useSettings} from './useSettingsContext';
import {nostrService} from '../services/NostrService';

export function useNostrSync() {
    const {upsertNote} = useNotes();
    const {settings} = useSettings();

    // Set the callback for incoming notes
    useEffect(() => {
        nostrService.setUpsertCallback(upsertNote);
    }, [upsertNote]);

    // Update identity and subscription when settings change
    useEffect(() => {
        // Only subscribe if we have a private key (identity)
        if (settings.nostr.privkey) {
            nostrService.setIdentity(settings.nostr.privkey);
            nostrService.setRelays(settings.nostr.relays || []);

            // This returns a cleanup function that closes the subscription
            const cleanup = nostrService.subscribe();
            return cleanup;
        } else {
            // Clear identity if logged out
            nostrService.setIdentity(null);
        }
    }, [settings.nostr.privkey, settings.nostr.relays]);
};
