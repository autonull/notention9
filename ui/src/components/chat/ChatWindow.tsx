import React, {useEffect, useMemo, useRef, useState} from 'react';
import {finalizeEvent, nip04, nip19} from 'nostr-tools';

import {useNostrProfile} from '../../hooks/useNostrProfile';
import {useNotes} from '../../hooks/useNotes';
import {useToast} from '../../hooks/useToast';
import {useSettings} from '../../hooks/useSettingsContext';
import type {Contact, NostrEvent} from '@notention/core';
import {formatNpub, hexToBytes, Logger, parseProperties, pool, resolveRelays} from '@notention/core';
import {ArrowLeftIcon, ChatIcon, DocumentDuplicateIcon, SendIcon, SettingsIcon, TrashIcon} from '../ui/icons';
import {Avatar} from '../ui/Avatar';
import {Button} from '../ui/Button';
import {IconButton} from '../ui/Button';
import {Input} from '../ui/Input';
import {Skeleton} from '../ui/Skeleton';
import {cn} from '../../utils/ui';

interface ChatWindowProps {
    privkey: string;
    pubkey: string;
    selectedContact: Contact | null;
    onBack: () => void;
    messages: (NostrEvent & { content: string })[];
    isLoading: boolean;
    onSendMessage: (
        peerPubkey: string,
        event: NostrEvent,
        decryptedContent: string
    ) => void;
    onOpenSettings?: () => void;
    onClearChat?: () => void;
}

export function ChatWindow({
                               privkey,
                               pubkey,
                               selectedContact,
                               onBack,
                               messages,
                               isLoading,
                               onSendMessage,
                               onOpenSettings,
                               onClearChat,
                           }: ChatWindowProps) {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const {addNote} = useNotes();
    const {addToast} = useToast();
    const {settings} = useSettings();

    const contactPubkey = useMemo(
        () => (selectedContact ? [selectedContact.pubkey] : []),
        [selectedContact]
    );
    const profiles = useNostrProfile(contactPubkey);
    const selectedProfile = selectedContact
        ? profiles[selectedContact.pubkey]
        : null;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact) return;

        try {
            const encryptedContent = await nip04.encrypt(
                privkey,
                selectedContact.pubkey,
                newMessage.trim()
            );
            const event = finalizeEvent(
                {
                    kind: 4,
                    created_at: Math.floor(Date.now() / 1000),
                    tags: [['p', selectedContact.pubkey]],
                    content: encryptedContent,
                },
                hexToBytes(privkey)
            );

            await Promise.all(pool.publish(resolveRelays(settings.nostr.relays), event));
            onSendMessage(selectedContact.pubkey, event, newMessage.trim());
            setNewMessage('');
        } catch (err) {
            Logger.getInstance().error('Failed to send message:', err instanceof Error ? err : new Error(String(err)));
        }
    };

    if (!selectedContact) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <ChatIcon className="h-5 w-5 text-[var(--app-faint)]"/>
                <p className="text-[13px] font-medium text-[var(--app-text-secondary)]">Select a contact to start chatting</p>
                <p className="text-[11px] text-[var(--app-faint)]">Your messages are end-to-end encrypted.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--app-line)] px-3 py-2">
                <IconButton
                    onClick={onBack}
                    icon={ArrowLeftIcon}
                    title="Back to chats"
                    aria-label="Back to chats"
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                />
                <Avatar
                    src={selectedProfile?.picture || selectedContact.picture}
                    pubkey={selectedContact.pubkey}
                    size="sm"
                />
                <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[var(--app-text)]">
                        {selectedContact.name || selectedProfile?.name || 'Anonymous'}
                    </p>
                    <p
                        className={cn('truncate font-mono text-[11px]', selectedContact.isAgent ? 'text-[var(--app-accent-text)]' : 'text-[var(--app-faint)]')}
                        title={selectedContact.isAgent ? 'AI agent' : nip19.npubEncode(selectedContact.pubkey)}
                    >
                        {selectedContact.isAgent ? 'Agent' : formatNpub(nip19.npubEncode(selectedContact.pubkey))}
                    </p>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-1">
                    {onClearChat && (
                        <IconButton
                            onClick={() => {
                                if (confirm('Clear the conversation with this contact?')) {
                                    onClearChat();
                                }
                            }}
                            icon={TrashIcon}
                            title="Clear chat"
                            aria-label="Clear chat"
                            variant="ghost"
                            size="sm"
                        />
                    )}
                    {onOpenSettings && (
                        <IconButton
                            onClick={onOpenSettings}
                            icon={SettingsIcon}
                            title="Agent settings"
                            aria-label="Agent settings"
                            variant="ghost"
                            size="sm"
                        />
                    )}
                </div>
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
                {messages.length === 0 && !isLoading && (
                    <div className="py-8 text-center">
                        <p className="text-[13px] text-[var(--app-text-secondary)]">No messages yet.</p>
                        <p className="text-[11px] text-[var(--app-faint)]">Say hello.</p>
                    </div>
                )}
                {isLoading && (
                    <div className="space-y-1.5" aria-busy="true" aria-label="Loading messages">
                        <Skeleton variant="rectangular" height={40} width="60%" className="rounded-lg"/>
                        <Skeleton variant="rectangular" height={40} width="70%" className="ml-auto rounded-lg"/>
                        <Skeleton variant="rectangular" height={40} width="50%" className="rounded-lg"/>
                    </div>
                )}
                {!isLoading && messages.map((msg, idx) => {
                    const isMe = msg.pubkey === pubkey;
                    const showTime = idx === messages.length - 1 || (idx < messages.length - 1 && messages[idx + 1].pubkey !== msg.pubkey);

                    return (
                        <div
                            key={msg.id}
                            className={cn('group flex flex-col', isMe ? 'items-end' : 'items-start')}
                        >
                            <div className="flex max-w-[85%] items-center gap-1.5 sm:max-w-[70%]">
                                <div
                                    className={cn(
                                        'min-w-0 whitespace-pre-wrap break-words rounded-lg border px-3 py-2 text-[13px] leading-6',
                                        isMe
                                            ? 'border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] text-[var(--app-text)]'
                                            : 'border-[var(--app-line)] bg-[var(--app-raised)] text-[var(--app-text-secondary)]'
                                    )}
                                >
                                    {msg.content}
                                </div>
                                {!isMe && (
                                    <IconButton
                                        onClick={() => {
                                            addNote({
                                                title: 'Chat note',
                                                content: msg.content,
                                                tags: [],
                                                properties: parseProperties(msg.content)
                                            });
                                            addToast('Forked to notes', 'success');
                                        }}
                                        icon={DocumentDuplicateIcon}
                                        title="Fork to notes"
                                        aria-label="Fork to notes"
                                        variant="ghost"
                                        size="xs"
                                        className="md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                                    />
                                )}
                            </div>
                            {showTime && (
                                <span className="mt-0.5 px-1 text-[11px] tabular-nums text-[var(--app-faint)]">
                                    {new Date(msg.created_at * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                </span>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef}/>
            </div>

            <div className="shrink-0 border-t border-[var(--app-line)] p-2">
                <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                        <Input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Write a message…"
                            aria-label="Message"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={!newMessage.trim()}
                        variant="primary"
                        size="sm"
                        icon={SendIcon}
                        aria-label="Send message"
                    />
                </form>
            </div>
        </div>
    );
}
