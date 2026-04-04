import React, {useMemo, useState} from 'react';
import {nip19} from 'nostr-tools';
import {useNostrProfile} from '../../hooks/index';
import type {Contact} from '@notention/core';
import {formatNpub, Logger} from '@notention/core';
import {SearchIcon, UserPlusIcon} from '../common/icons';
import {Avatar} from '../common/Avatar';
import {IconButton} from '../common/IconButton';
import {Button} from '../common/Button';
import {Input} from '../common/Input';

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
                throw new Error('Invalid npub format.');

            if (contacts.some((c) => c.pubkey === newPubkey) || newPubkey === pubkey)
                throw new Error('Contact already exists or is yourself.');

            await onAddContact(newPubkey);

            setNewContactNpub('');
            setIsAddingContact(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add contact.');
            Logger.getInstance().error("Failed to add contact", err instanceof Error ? err : new Error(String(err)));
        }
    };

    const renderContactItem = (contact: Contact) => {
        const profile = contactProfiles[contact.pubkey];
        const isSelected = selectedContact?.pubkey === contact.pubkey;

        return (
            <div
                key={contact.pubkey}
                onClick={() => onSelectContact(contact)}
                className={`
            flex items-center gap-3 p-3 cursor-pointer transition-colors
            ${isSelected ? 'bg-blue-900/20 border-r-2 border-blue-500' : 'hover:bg-gray-800/50 border-r-2 border-transparent'}
          `}
            >
                <div className="relative">
                    <Avatar
                        src={profile?.picture || contact.picture}
                        pubkey={contact.pubkey}
                        size="md"
                    />
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                        <p className={`font-semibold truncate text-sm ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                            {contact.name || profile?.name || (
                                (() => {
                                    try {
                                        return formatNpub(nip19.npubEncode(contact.pubkey));
                                    } catch {
                                        return contact.pubkey;
                                    }
                                })()
                            )}
                        </p>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                        {contact.about || profile?.about || 'No bio available'}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col border-r border-gray-700/50 bg-gray-900/50">
            <div className="p-4 border-b border-gray-700/50 space-y-3">
                <h2 className="text-lg font-bold text-white flex justify-between items-center">
                    Chats
                    <div className="flex gap-1">
                        <IconButton
                            onClick={() => setIsAddingContact(!isAddingContact)}
                            icon={UserPlusIcon}
                            title="Add Contact"
                            variant={isAddingContact ? 'primary' : 'secondary'}
                            size="sm"
                        />
                    </div>
                </h2>

                {isAddingContact && (
                    <div className="animate-fade-in bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                        <form onSubmit={handleAddContact} className="flex flex-col gap-2">
                            <Input
                                value={newContactNpub}
                                onChange={(e) => setNewContactNpub(e.target.value)}
                                placeholder="npub..."
                                autoFocus
                                className="text-sm"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    onClick={() => setIsAddingContact(false)}
                                    variant="ghost"
                                    size="xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="xs"
                                >
                                    Add
                                </Button>
                            </div>
                        </form>
                        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                    </div>
                )}

                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500"/>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-full py-1.5 pl-9 pr-4 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto">
                {isLoading && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        Loading...
                    </div>
                )}

                {filteredContacts.map(renderContactItem)}

                {!isLoading && contacts.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-sm">
                        <p className="mb-2">No contacts yet.</p>
                        <p>Add someone via npub to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
