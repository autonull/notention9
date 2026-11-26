import type { ReactNode } from 'react';

export interface ActionableEmptyStateConfig {
  id: string;
  illustration: ReactNode;
  title: string;
  description: string;
  primaryAction: () => void;
  primaryLabel: string;
  secondaryAction?: () => void;
  secondaryLabel?: string;
  helpTopicId?: string;
}

export interface ActionableEmptyStateProps {
  variant: keyof typeof EMPTY_STATE_CONFIGS;
  className?: string;
  testId?: string;
}

export const EMPTY_STATE_CONFIGS: Record<string, ActionableEmptyStateConfig> = {
  'notes-all': {
    id: 'notes-all',
    illustration: null,
    title: 'Start your knowledge graph',
    description: 'Create your first note to begin building connections. Notes can be tasks, ideas, journal entries, or anything you want to remember.',
    primaryAction: () => { window.dispatchEvent(new CustomEvent('create-note')); },
    primaryLabel: 'Create your first note',
    secondaryAction: () => { window.dispatchEvent(new CustomEvent('load-sample')); },
    secondaryLabel: 'Load sample workspace',
    helpTopicId: 'create-first-note',
  },
  'notes-search': {
    id: 'notes-search',
    illustration: null,
    title: 'No matching notes',
    description: 'Your search didn\'t match any notes.',
    primaryAction: () => { window.dispatchEvent(new CustomEvent('clear-search')); },
    primaryLabel: 'Clear search',
    secondaryAction: () => { window.dispatchEvent(new CustomEvent('create-note')); },
    secondaryLabel: 'Create note',
    helpTopicId: 'tags-and-filters',
  },
  'network': {
    id: 'network',
    illustration: null,
    title: 'No network connections',
    description: 'Connect to Nostr relays to discover and share notes with others. Your data stays local until you choose to share.',
    primaryAction: () => { window.dispatchEvent(new CustomEvent('configure-relays')); },
    primaryLabel: 'Configure relays',
    helpTopicId: 'connect-network',
  },
  'map': {
    id: 'map',
    illustration: null,
    title: 'No locations yet',
    description: 'Add locations to your notes to see them on the map.',
    primaryAction: () => { window.dispatchEvent(new CustomEvent('add-location')); },
    primaryLabel: 'Add location to note',
    helpTopicId: 'use-map',
  },
  'timeline': {
    id: 'timeline',
    illustration: null,
    title: 'No dated notes',
    description: 'Add date properties to your notes to see them on the timeline.',
    primaryAction: () => { window.dispatchEvent(new CustomEvent('add-date-property')); },
    primaryLabel: 'Add date property',
    helpTopicId: 'use-timeline',
  },
  'matches': {
    id: 'matches',
    illustration: null,
    title: 'No matches yet',
    description: 'Describe what you need in plain English to find relevant connections.',
    primaryAction: () => { window.dispatchEvent(new CustomEvent('open-describe-it')); },
    primaryLabel: 'Describe what you need',
    helpTopicId: 'semantic-matching',
  },
  'chat': {
    id: 'chat',
    illustration: null,
    title: 'No conversations yet',
    description: 'Start a chat to communicate with your connections.',
    primaryAction: () => { window.dispatchEvent(new CustomEvent('start-chat')); },
    primaryLabel: 'Start chat',
    helpTopicId: 'chat-basics',
  },
  'ontology': {
    id: 'ontology',
    illustration: null,
    title: 'No schema imported',
    description: 'Import a schema to define your data structure and enable smart features.',
    primaryAction: () => { window.dispatchEvent(new CustomEvent('import-schema')); },
    primaryLabel: 'Import schema',
    secondaryAction: () => { window.dispatchEvent(new CustomEvent('browse-registry')); },
    secondaryLabel: 'Browse registry',
    helpTopicId: 'skills-and-ontology',
  },
  'skills': {
    id: 'skills',
    illustration: null,
    title: 'No skills installed',
    description: 'Browse the skill registry to add new capabilities to your workspace.',
    primaryAction: () => { window.dispatchEvent(new CustomEvent('browse-registry')); },
    primaryLabel: 'Browse registry',
    helpTopicId: 'skills-and-ontology',
  },
};