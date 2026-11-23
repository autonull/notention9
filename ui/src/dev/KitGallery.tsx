import React, {useState} from 'react';
import type {Note} from '@notention/core';
import {createNote} from '@notention/core';
import {Button} from '../components/ui/Button';
import {Input} from '../components/ui/Input';
import {Chip, ChoiceGrid, Hint, Kbd, SectionHeader, Segmented, Tabs, Toolbar} from '../components/ui/kit';
import {PageMeta, PageSurface, PageTitle, DetailChips} from '../components/patterns/PageSurface';
import {FeedRow} from '../components/patterns/FeedRow';
import {IdentityStrip} from '../components/patterns/IdentityStrip';
import {SettingsSection} from '../components/patterns/SettingsSection';
import {ArrangeMenu} from '../components/patterns/ArrangeMenu';
import type {NoteMode, NotesGroup, SortOrder} from '@notention/core';
import {NOTE_SECTIONS} from '../config/uiSurfaces';

const fixtureNote: Note = createNote({
    id: 'kit-note',
    title: 'A page with one detail',
    content: '<p>The body keeps the measure.</p>',
    tags: ['kit', 'design'],
    properties: [
        {key: 'status', operator: 'is', values: ['planned']},
        {key: 'deadline', operator: 'is', values: ['2026-12-01']},
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
});

const TONES = ['neutral', 'accent', 'success', 'warning', 'danger'] as const;

export default function KitGallery() {
    const [title, setTitle] = useState('The page is the interface');
    const [section, setSection] = useState<'all' | 'tasks' | 'tags' | 'trash'>('all');
    const [mode, setMode] = useState<NoteMode>('board');
    const [order, setOrder] = useState<SortOrder>('updatedAt_desc');
    const [group, setGroup] = useState<NotesGroup>('status');
    const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    const applyTheme = (next: 'dark' | 'light') => {
        setTheme(next);
        document.documentElement.dataset.theme = next;
    };
    const applyDensity = (next: 'compact' | 'comfortable') => {
        setDensity(next);
        document.documentElement.classList.toggle('density-compact', next === 'compact');
        document.documentElement.classList.toggle('density-comfortable', next === 'comfortable');
    };

    return (
        <div className="min-h-screen bg-[var(--app-bg)] px-6 py-8 text-[var(--app-text)]">
            <header className="mb-8 flex flex-wrap items-center gap-3 border-b border-[var(--app-line)] pb-4">
                <div className="mr-auto">
                    <h1 className="text-lg font-semibold">Kit gallery</h1>
                    <p className="text-sm text-[var(--app-muted)]">Tokens, primitives, and patterns with fixed fixtures. No app state.</p>
                </div>
                <Button variant={theme === 'dark' ? 'primary' : 'secondary'} size="sm" onClick={() => applyTheme('dark')}>Dark</Button>
                <Button variant={theme === 'light' ? 'primary' : 'secondary'} size="sm" onClick={() => applyTheme('light')}>Light</Button>
                <Button variant={density === 'compact' ? 'primary' : 'secondary'} size="sm" onClick={() => applyDensity('compact')}>Compact</Button>
                <Button variant={density === 'comfortable' ? 'primary' : 'secondary'} size="sm" onClick={() => applyDensity('comfortable')}>Comfortable</Button>
            </header>

            <div className="grid gap-10 xl:grid-cols-2">
                <section className="space-y-4">
                    <SectionHeader title="Type" description="Page title, body, meta, and chrome."/>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {[24, 32, 40].map(width => (
                            <div key={width} className="rounded-lg border border-[var(--app-line)] p-3" style={{maxWidth: width * 8}}>
                                <p className="page-title">The page is the interface</p>
                                <p className="page-body">The body keeps a left-aligned measure at every width.</p>
                                <p className="page-meta">Saved · 12 words</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <SectionHeader title="Buttons" description="One primary per surface."/>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="primary">Primary</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="danger">Danger</Button>
                        <Button variant="primary" disabled>Disabled</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input placeholder="Search notes…" className="w-56"/>
                        <Input placeholder="Disabled" disabled className="w-56"/>
                    </div>
                </section>

                <section className="space-y-4">
                    <SectionHeader title="Chips and tones" description="One tone map for chips, banners, toasts, and status."/>
                    <div className="flex flex-wrap gap-2">
                        {TONES.map(value => <Chip key={value} tone={value}>{value}</Chip>)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Kbd>⌘</Kbd><Kbd>K</Kbd>
                        <Hint>Shortcuts stay one row.</Hint>
                    </div>
                </section>

                <section className="space-y-4">
                    <SectionHeader title="Segmented and tabs" description="Mutually exclusive display choices."/>
                    <Segmented
                        label="Sections"
                        options={NOTE_SECTIONS}
                        value={section}
                        onChange={setSection}
                        compact={false}
                    />
                    <Tabs
                        label="Note tabs"
                        options={[
                            {id: 'next', label: 'Next'},
                            {id: 'matches', label: 'Matches'},
                            {id: 'replies', label: 'Replies'},
                            {id: 'chat', label: 'Chat'},
                        ]}
                        value="next"
                        onChange={() => undefined}
                    />
                </section>

                <section className="space-y-4">
                    <SectionHeader title="Page surface" description="The document fills the pane; the title lives in the page."/>
                    <div className="flex h-[420px] overflow-hidden rounded-xl border border-[var(--app-line)]">
                        <PageSurface>
                            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[var(--page-pad)] py-8">
                                <PageTitle title={title} onChange={event => setTitle(event.target.value)}/>
                                <PageMeta>Saved · 19 words</PageMeta>
                                <p className="page-body mt-4">A page is not a card. The measure is left-aligned and the chrome stays quiet.</p>
                                <DetailChips note={fixtureNote} onEdit={() => undefined} onAdd={() => undefined}/>
                            </div>
                        </PageSurface>
                    </div>
                </section>

                <section className="space-y-4">
                    <SectionHeader title="Rows" description="History, feed, and identity share one row grammar."/>
                    <div className="space-y-1 rounded-xl border border-[var(--app-line)] p-2">
                        <FeedRow
                            title="A row with one detail"
                            meta="2h"
                            body="The body is one line of context."
                            chips={<><Chip tone="accent">planned</Chip><Chip>kit</Chip></>}
                            onSelect={() => undefined}
                        />
                        <FeedRow title="Selected row" meta="1d" selected onSelect={() => undefined}/>
                    </div>
                    <div className="rounded-xl border border-[var(--app-line)] p-3">
                        <IdentityStrip
                            avatar={<div className="h-7 w-7 rounded-full bg-[var(--app-accent-soft)]"/>}
                            name="Ada Lovelace"
                            handle={<span className="text-xs text-[var(--app-faint)]">@ada</span>}
                            chips={<Chip tone="success">relay</Chip>}
                            actions={<Button size="sm" variant="ghost">Edit</Button>}
                        />
                    </div>
                </section>

                <section className="space-y-4">
                    <SectionHeader title="Arrange" description="One control for layout, order, and group."/>
                    <Toolbar>
                        <ArrangeMenu
                            mode={mode}
                            onModeChange={setMode}
                            sortOrder={order}
                            onSortOrderChange={setOrder}
                            group={group}
                            onGroupChange={setGroup}
                        />
                        <span className="text-xs text-[var(--app-muted)]">Board groups by status; the other arrangements own their own grouping.</span>
                    </Toolbar>
                </section>

                <section className="space-y-4">
                    <SectionHeader title="Settings section" description="One heading, one card style, one gap rhythm."/>
                    <SettingsSection title="Appearance" description="Theme, density, and accent follow one grammar.">
                        <div className="rounded-lg border border-[var(--app-line)] bg-[var(--app-panel)] p-3">
                            <ChoiceGrid
                                label="Theme"
                                options={[{id: 'dark', label: 'Dark'}, {id: 'light', label: 'Light'}]}
                                value={theme}
                                onChange={value => applyTheme(value as 'dark' | 'light')}
                            />
                        </div>
                    </SettingsSection>
                </section>

                <section className="space-y-4">
                    <SectionHeader title="Tokens" description="One palette; accent only for focus, selection, publish, and the active tab."/>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {['bg', 'surface', 'panel', 'raised', 'hover', 'line', 'text', 'muted'].map(token => (
                            <div key={token} className="rounded-lg border border-[var(--app-line)] p-2">
                                <div className="mb-2 h-10 rounded" style={{background: `var(--app-${token})`}}/>
                                <span className="text-xs text-[var(--app-muted)]">--app-{token}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
