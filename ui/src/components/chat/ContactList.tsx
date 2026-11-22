import React, {useMemo, useState} from 'react';
import {nip19} from 'nostr-tools';
import {useNostrProfile} from '../../hooks/useNostrProfile';
import type {Contact} from '@notention/core';
import {formatNpub, Logger} from '@notention/core';
import {SearchIcon, UserPlusIcon} from '../ui/icons';
import {Avatar} from '../ui/Avatar';
import {IconButton} from '../ui/Button';
import {Button} from '../ui/Button';
import {Input} from '../ui/Input';
import {Skeleton} from '../ui/Skeleton';
import {EmptyState} from '../ui/Primitives';
import {FeedRow} from '../patterns/FeedRow';

interface ContactListProps {
    privkey: string;
    pubkey: string;
    contacts: Contact[];
    onAddContact: (pubkey: string) => Promise<void>;
    selectedContact: Contact | null;
    onSelectContact: (contact: Contact) => void;
    isLoading: boolean;
}

export function ContactList({
                                privkey,
                                pubkey,
                                contacts,
                                onAddContact,
                                selectedContact,
                                onSelectContact,
                                isLoading,
                            }: ContactListProps) {
    const [newContactNpub, setNewContactNpub] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingContact, setIsAddingContact] = useState(false);

    const contactPubkeys = useMemo(
        () => contacts.map((c) => c.pubkey),
        [contacts]
    );
    const contactProfiles = useNostrProfile(contactPubkeys);

    const filteredContacts = useMemo(() => {
        if (!searchTerm) return contacts;
        return contacts.filter(c => {
            const profile = contactProfiles[c.pubkey];
            const name = profile?.name || c.name || '';
            return name.toLowerCase().includes(searchTerm.toLowerCase()) || c.pubkey.includes(searchTerm);
        });
    }, [contacts, searchTerm, contactProfiles]);

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!newContactNpub.trim()) return;

        try {
            const {type, data: newPubkey} = nip19.decode(newContactNpub.trim());
            if (type !== 'npub' || typeof newPubkey !== 'string')
                throw new Error('Enter a valid npub.');

            if (contacts.some((c) => c.pubkey === newPubkey) || newPubkey === pubkey)
                throw new Error('This contact already exists.');

            await onAddContact(newPubkey);

            setNewContactNpub('');
            setIsAddingContact(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add this contact.');
            Logger.getInstance().error('Failed to add contact', err instanceof Error ? err : new Error(String(err)));
        }
    };

    const displayName = (contact: Contact) => {
        const profile = contactProfiles[contact.pubkey];
        if (contact.name || profile?.name) return contact.name || profile?.name;
        try {
            return formatNpub(nip19.npubEncode(contact.pubkey));
        } catch {
            return contact.pubkey;
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col border-r border-[var(--app-line)]">
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--app-line)] px-3 py-2">
                <h2 className="text-[13px] font-medium text-[var(--app-text)]">Chats</h2>
                <IconButton
                    onClick={() => setIsAddingContact(value => !value)}
                    icon={UserPlusIcon}
                    title="Add contact"
                    aria-label="Add contact"
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                />
            </div>

            <div className="shrink-0 space-y-2 border-b border-[var(--app-line)] px-3 py-2">
                {isAddingContact && (
                    <form onSubmit={handleAddContact} className="space-y-1.5">
                        <Input
                            value={newContactNpub}
                            onChange={(e) => setNewContactNpub(e.target.value)}
                            placeholder="npub1…"
                            aria-label="Contact npub"
                            autoFocus
                        />
                        <div className="flex justify-end gap-1">
                            <Button type="button" onClick={() => setIsAddingContact(false)} variant="ghost" size="xs">
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" size="xs">
                                Add
                            </Button>
                        </div>
                        {error && <p className="text-[11px] text-red-300">{error}</p>}
                    </form>
                )}
                <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search contacts"
                    aria-label="Search contacts"
                    leftIcon={<SearchIcon className="h-4 w-4"/>}
                />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {isLoading && (
                    <div className="space-y-1" aria-busy="true" aria-label="Loading contacts">
                        {Array.from({length: 5}).map((_, index) => (
                            <Skeleton key={index} variant="rectangular" height={48} width="100%" className="rounded-lg"/>
                        ))}
                    </div>
                )}

                {!isLoading && filteredContacts.map(contact => (
                    <FeedRow
                        key={contact.pubkey}
                        leading={
                            <Avatar
                                src={contactProfiles[contact.pubkey]?.picture || contact.picture}
                                pubkey={contact.pubkey}
                                size="sm"
                            />
                        }
                        title={displayName(contact)}
                        body={
                            <span className="line-clamp-1">
                                {contact.about || contactProfiles[contact.pubkey]?.about || 'No bio yet'}
                            </span>
                        }
                        onSelect={() => onSelectContact(contact)}
                        selected={selectedContact?.pubkey === contact.pubkey}
                    />
                ))}

                {!isLoading && contacts.length === 0 && (
                    <EmptyState
                        variant="minimal"
                        icon={UserPlusIcon}
                        title="No contacts yet"
                        description="Add someone by npub to start chatting."
                    />
                )}
            </div>
        </div>
    );
}
