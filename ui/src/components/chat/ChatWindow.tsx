import React, {useEffect, useMemo, useRef, useState} from 'react';
import {finalizeEvent, nip04, nip19} from 'nostr-tools';

import {useNostrProfile} from '../../hooks/useNostrProfile';
import {useNotes} from '../../hooks/useNotes';
import {useToast} from '../../hooks/useToast';
import {useSettings} from '../../hooks/useSettingsContext';
import type {Contact, NostrEvent} from '@notention/core';
import {formatNpub, hexToBytes, Logger, parseProperties, pool, resolveRelays} from '@notention/core';
import {ArrowLeftIcon, DocumentDuplicateIcon, SendIcon, SettingsIcon, TrashIcon} from '../ui/icons';
import {Avatar} from '../ui/Avatar';
import {IconButton} from '../ui/Button';
import {Skeleton} from '../ui/Skeleton';

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
            <div className="h-full flex flex-col bg-neutral-800/20 items-center justify-center text-center text-neutral-400">
                <div className="bg-neutral-800 p-8 rounded-full mb-4">
                    <span className="text-4xl">💬</span>
                </div>
                <p className="text-lg font-semibold text-neutral-400">Select a contact to start chatting</p>
                <p className="text-sm">Your messages are end-to-end encrypted.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-neutral-900/30">
            {/* Header */}
            <div className="flex-shrink-0 p-3 border-b border-neutral-700/50 flex items-center gap-3 bg-neutral-900/50">
                <div className="md:hidden -ml-1">
                    <IconButton
                        onClick={onBack}
                        icon={ArrowLeftIcon}
                        title="Back"
                        variant="ghost"
                    />
                </div>
                <div className="relative">
                    <Avatar
                        src={selectedProfile?.picture || selectedContact.picture}
                        pubkey={selectedContact.pubkey}
                        size="md"
                        className="border border-neutral-600"
                    />
                    {/* Online status could go here */}
                </div>

                <div className="min-w-0">
                    <p className="font-bold text-white truncate">
                        {selectedContact.name || selectedProfile?.name || 'Anonymous'}
                    </p>
                    {!selectedContact.isAgent && (
                        <p
                            className="text-xs text-neutral-400 font-mono truncate"
                            title={nip19.npubEncode(selectedContact.pubkey)}
                        >
                            {formatNpub(nip19.npubEncode(selectedContact.pubkey))}
                        </p>
                    )}
                    {selectedContact.isAgent && (
                        <p className="text-xs text-blue-400 font-mono truncate">
                            AI Agent
                        </p>
                    )}
                </div>

                <div className="flex-1"/>

                {onClearChat && (
                    <IconButton
                        onClick={() => {
                            if (confirm('Clear chat history with this agent?')) {
                                onClearChat();
                            }
                        }}
                        icon={TrashIcon}
                        title="Clear Chat"
                        variant="danger"
                    />
                )}

                {onOpenSettings && (
                    <IconButton
                        onClick={onOpenSettings}
                        icon={SettingsIcon}
                        title="Agent Settings"
                        variant="ghost"
                    />
                )}
            </div>

            {/* Messages */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.length === 0 && !isLoading && (
                    <div className="text-center text-neutral-400 py-10">
                        <p>No messages yet.</p>
                        <p className="text-xs">Say hello! 👋</p>
                    </div>
                )}
                {isLoading && (
                    <div className="space-y-4">
                        <Skeleton variant="rectangular" height={80} width="60%" className="rounded-2xl mx-auto"/>
                        <Skeleton variant="rectangular" height={80} width="70%" className="rounded-2xl ml-auto"/>
                        <Skeleton variant="rectangular" height={80} width="50%" className="rounded-2xl mx-auto"/>
                    </div>
                )}
                {!isLoading && messages.length > 0 && messages.map((msg, idx) => {
                    const isMe = msg.pubkey === pubkey;
                    const showTime = idx === messages.length - 1 || (idx < messages.length - 1 && messages[idx + 1].pubkey !== msg.pubkey);

                    return (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                        >
                            <div className="flex items-center gap-2">
                                {!isMe && (
                                    <IconButton
                                        onClick={() => {
                                            const properties = parseProperties(msg.content);
                                            addNote({
                                                title: 'Chat Note',
                                                content: msg.content,
                                                tags: [],
                                                properties
                                            });
                                            addToast('Forked to Notes', 'success');
                                        }}
                                        icon={DocumentDuplicateIcon}
                                        title="Fork to Notes"
                                        variant="ghost"
                                        size="xs"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                )}
                                <div
                                    className={`
                        max-w-[85%] sm:max-w-lg px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm
                        ${isMe
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-neutral-700 text-neutral-100 rounded-tl-sm border border-neutral-600'}
                      `}
                                >
                                    <p className="whitespace-pre-wrap break-words">
                                        {msg.content}
                                    </p>
                                </div>
                            </div>
                            {showTime && (
                                <span className="text-xs text-neutral-400 mt-1 px-1">
                        {new Date(msg.created_at * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </span>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef}/>
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-4 bg-neutral-900/50 border-t border-neutral-700/50">
                <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-grow p-3 bg-neutral-800 border border-neutral-700 rounded-full text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    <IconButton
                        type="submit"
                        disabled={!newMessage.trim()}
                        icon={SendIcon}
                        variant="primary"
                        className="rounded-full shadow-lg p-3"
                    />
                </form>
            </div>
        </div>
    );
}
