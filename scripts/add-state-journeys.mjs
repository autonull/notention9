import { readFileSync, writeFileSync } from 'fs';

const graphFile = '/home/me/notention9/doc/uisg/graph.json';
const graph = JSON.parse(readFileSync(graphFile, 'utf8'));

// Add missing state nodes (as surfaces or capabilities)
const newNodes = [
    // State surfaces/capabilities
    {
        id: 'state.loading',
        type: 'surface',
        name: 'Loading state',
        status: 'planned',
        component: 'LoadingSpinner',
        summary: 'Generic loading indicator for async operations',
    },
    {
        id: 'state.empty',
        type: 'surface',
        name: 'Empty state',
        status: 'implemented',
        component: 'EmptyState',
        route: '#/notes',
        summary: 'Empty notes list with New note CTA',
    },
    {
        id: 'state.error',
        type: 'surface',
        name: 'Error state',
        status: 'planned',
        component: 'ErrorDisplay',
        summary: 'Generic error display with retry action',
    },
    {
        id: 'state.denied',
        type: 'surface',
        name: 'Denied/permission state',
        status: 'planned',
        component: 'PermissionDenied',
        summary: 'Shown when user lacks permission for an action',
    },
    {
        id: 'state.offline',
        type: 'surface',
        name: 'Offline state',
        status: 'planned',
        component: 'OfflineBanner',
        summary: 'Banner indicating offline mode with queue status',
    },
    {
        id: 'state.degraded',
        type: 'surface',
        name: 'Degraded connectivity state',
        status: 'planned',
        component: 'DegradedBanner',
        summary: 'Banner indicating degraded connectivity with sync status',
    },
    {
        id: 'state.publish-ready',
        type: 'surface',
        name: 'Publish ready state',
        status: 'planned',
        component: 'PublishReady',
        summary: 'Confirmation before publishing with preview',
    },
    {
        id: 'state.extracting',
        type: 'surface',
        name: 'Extracting state',
        status: 'implemented',
        component: 'ExtractionStatus',
        summary: 'Shows property extraction progress in editor',
    },
    {
        id: 'state.no-match',
        type: 'surface',
        name: 'No match state',
        status: 'planned',
        component: 'NoMatch',
        summary: 'Shown when no local matches found for a note',
    },
    {
        id: 'state.rejected',
        type: 'surface',
        name: 'Rejected state',
        status: 'planned',
        component: 'RejectedDisplay',
        summary: 'Shown when a match or action is rejected',
    },

    // Network capabilities
    {
        id: 'cap.network.publish',
        type: 'capability',
        name: 'Publish note to relay',
        status: 'implemented',
        seam: 'display',
        risk: 'destructive',
        effect: 'publish_note',
        source: ['optimize/src/policy.ts'],
    },
    {
        id: 'cap.network.reply',
        type: 'capability',
        name: 'Reply to note via relay',
        status: 'planned',
        seam: 'display',
        risk: 'normal',
        summary: 'Send a reply note through relay',
    },
    {
        id: 'cap.network.explore-feed',
        type: 'capability',
        name: 'Explore feed',
        status: 'planned',
        seam: 'display',
        summary: 'Browse relay feed of public notes',
    },
    {
        id: 'cap.network.chat',
        type: 'capability',
        name: 'Chat/DM',
        status: 'planned',
        seam: 'display',
        summary: 'Direct message conversation',
    },
    {
        id: 'cap.network.relay-status',
        type: 'capability',
        name: 'Relay status monitor',
        status: 'planned',
        seam: 'layout',
        summary: 'Show relay connection status and queue',
    },

    // Import/export capabilities
    {
        id: 'cap.data.import',
        type: 'capability',
        name: 'Import notes',
        status: 'planned',
        seam: 'capture',
        risk: 'caution',
        summary: 'Import notes from file',
    },
    {
        id: 'cap.data.export',
        type: 'capability',
        name: 'Export notes',
        status: 'planned',
        seam: 'display',
        risk: 'normal',
        summary: 'Export notes to file',
    },
    {
        id: 'cap.data.trash',
        type: 'capability',
        name: 'Trash/delete note',
        status: 'implemented',
        seam: 'display',
        risk: 'destructive',
        effect: 'delete_note',
        source: ['ui/src/components/notes/NoteActions.tsx'],
    },

    // Configuration capabilities
    {
        id: 'cap.config.theme',
        type: 'capability',
        name: 'Theme configuration',
        status: 'implemented',
        seam: 'layout',
        summary: 'Switch between dark/light themes',
    },
    {
        id: 'cap.config.density',
        type: 'capability',
        name: 'Density configuration',
        status: 'implemented',
        seam: 'layout',
        summary: 'Adjust UI density (compact/comfortable/spacious)',
    },
    {
        id: 'cap.config.ai-toggle',
        type: 'capability',
        name: 'AI on/off toggle',
        status: 'implemented',
        seam: 'layout',
        summary: 'Enable/disable AI features',
    },
    {
        id: 'cap.config.profile',
        type: 'capability',
        name: 'Capability profile selection',
        status: 'planned',
        seam: 'layout',
        summary: 'Select minimal/default/full capability profile',
    },

    // Mobile viewports
    {
        id: 'surface.mobile-capture',
        type: 'surface',
        name: 'Mobile capture view',
        status: 'planned',
        component: 'MobileCapture',
        summary: 'Capture interface optimized for mobile viewport',
    },
    {
        id: 'surface.mobile-match',
        type: 'surface',
        name: 'Mobile match view',
        status: 'planned',
        component: 'MobileMatchRail',
        summary: 'Match rail optimized for mobile viewport',
    },

    // Metaphor/skill/automation surfaces
    {
        id: 'cap.automation.rule',
        type: 'capability',
        name: 'Automation rule',
        status: 'planned',
        seam: 'intent',
        summary: 'Create automation rules for note processing',
    },
    {
        id: 'cap.automation.scheduled',
        type: 'capability',
        name: 'Scheduled task',
        status: 'planned',
        seam: 'intent',
        summary: 'Run automation on schedule',
    },
    {
        id: 'cap.automation.monitor',
        type: 'capability',
        name: 'Monitoring agent',
        status: 'planned',
        seam: 'intent',
        summary: 'Background agent monitoring notes',
    },
];

// Add new flow nodes for state journeys
const newFlows = [
    {
        id: 'flow.loading',
        type: 'flow',
        name: 'Loading state journey',
        status: 'planned',
        entry: 'step.loading.start',
        outcome: 'Loading completes or times out',
        confidence: 'medium',
    },
    {
        id: 'flow.error',
        type: 'flow',
        name: 'Error state journey',
        status: 'planned',
        entry: 'step.error.trigger',
        outcome: 'Error displayed with recovery options',
        confidence: 'medium',
    },
    {
        id: 'flow.offline',
        type: 'flow',
        name: 'Offline state journey',
        status: 'planned',
        entry: 'step.offline.detect',
        outcome: 'Offline banner shown, queue persisted',
        confidence: 'medium',
    },
    {
        id: 'flow.import-export',
        type: 'flow',
        name: 'Import/export round trip',
        status: 'planned',
        entry: 'step.import.start',
        outcome: 'Notes imported and exported successfully',
        confidence: 'medium',
    },
    {
        id: 'flow.trash-delete',
        type: 'flow',
        name: 'Trash/delete with guardrail',
        status: 'planned',
        entry: 'step.trash.open',
        outcome: 'Note deleted with confirmation',
        confidence: 'medium',
    },
    {
        id: 'flow.mobile-capture',
        type: 'flow',
        name: 'Mobile capture journey',
        status: 'planned',
        entry: 'step.mobile.capture.start',
        outcome: 'Note captured on mobile viewport',
        confidence: 'medium',
    },
    {
        id: 'flow.mobile-match',
        type: 'flow',
        name: 'Mobile match journey',
        status: 'planned',
        entry: 'step.mobile.match.start',
        outcome: 'Match viewed on mobile viewport',
        confidence: 'medium',
    },
];

// Add step nodes for the new flows
const newSteps = [
    // Loading flow
    { id: 'step.loading.start', type: 'step', name: 'Loading starts', status: 'planned', kind: 'show', guard: 'asyncOperationStarted' },
    { id: 'step.loading.complete', type: 'step', name: 'Loading completes', status: 'planned', kind: 'result', statePath: 'loading', stateEquals: false },

    // Error flow
    { id: 'step.error.trigger', type: 'step', name: 'Error triggered', status: 'planned', kind: 'show', guard: 'errorOccurred' },
    { id: 'step.error.display', type: 'step', name: 'Error displayed', status: 'planned', kind: 'show' },
    { id: 'step.error.retry', type: 'step', name: 'Retry action', status: 'planned', kind: 'action', action: 'click', target: { testId: 'error-retry' } },

    // Offline flow
    { id: 'step.offline.detect', type: 'step', name: 'Offline detected', status: 'planned', kind: 'show', guard: 'navigator.onLine === false' },
    { id: 'step.offline.banner', type: 'step', name: 'Offline banner shown', status: 'planned', kind: 'show' },
    { id: 'step.offline.queue', type: 'step', name: 'Action queued', status: 'planned', kind: 'result', statePath: 'offlineQueue.length', stateEquals: 1 },

    // Import/export flow
    { id: 'step.import.start', type: 'step', name: 'Start import', status: 'planned', kind: 'action', action: 'click', target: { testId: 'import-button' } },
    { id: 'step.import.file', type: 'step', name: 'Select file', status: 'planned', kind: 'action', action: 'fill', target: { testId: 'import-file-input' } },
    { id: 'step.import.confirm', type: 'step', name: 'Confirm import', status: 'planned', kind: 'confirm', action: 'click', target: { role: 'button', name: 'Import' } },
    { id: 'step.import.done', type: 'step', name: 'Import complete', status: 'planned', kind: 'result', statePath: 'notes.length' },

    // Trash/delete flow
    { id: 'step.trash.open', type: 'step', name: 'Open trash menu', status: 'planned', kind: 'action', action: 'click', target: { testId: 'note-trash-button' } },
    { id: 'step.trash.confirm', type: 'step', name: 'Confirm delete', status: 'planned', kind: 'confirm', action: 'click', target: { role: 'button', name: 'Delete', exact: true } },
    { id: 'step.trash.done', type: 'step', name: 'Note deleted', status: 'planned', kind: 'result', statePath: 'notes.length' },

    // Mobile capture flow
    { id: 'step.mobile.capture.start', type: 'step', name: 'Open mobile capture', status: 'planned', kind: 'action', action: 'click', target: { testId: 'mobile-new-note' } },
    { id: 'step.mobile.capture.write', type: 'step', name: 'Write note on mobile', status: 'planned', kind: 'action', action: 'fill', target: { testId: 'mobile-note-body' } },
    { id: 'step.mobile.capture.save', type: 'step', name: 'Save mobile note', status: 'planned', kind: 'confirm', action: 'click', target: { role: 'button', name: 'Save' } },

    // Mobile match flow
    { id: 'step.mobile.match.start', type: 'step', name: 'Open mobile match rail', status: 'planned', kind: 'action', action: 'click', target: { role: 'tab', name: 'Matches' } },
    { id: 'step.mobile.match.view', type: 'step', name: 'View match on mobile', status: 'planned', kind: 'show' },
];

// Add edges for the new flows
const newEdges = [
    // Loading flow
    { from: 'flow.loading', type: 'contains', to: 'step.loading.start' },
    { from: 'flow.loading', type: 'contains', to: 'step.loading.complete' },
    { from: 'step.loading.start', type: 'next', to: 'step.loading.complete', when: 'loaded' },

    // Error flow
    { from: 'flow.error', type: 'contains', to: 'step.error.trigger' },
    { from: 'flow.error', type: 'contains', to: 'step.error.display' },
    { from: 'flow.error', type: 'contains', to: 'step.error.retry' },
    { from: 'step.error.trigger', type: 'next', to: 'step.error.display' },
    { from: 'step.error.display', type: 'next', to: 'step.error.retry', when: 'retry' },

    // Offline flow
    { from: 'flow.offline', type: 'contains', to: 'step.offline.detect' },
    { from: 'flow.offline', type: 'contains', to: 'step.offline.banner' },
    { from: 'flow.offline', type: 'contains', to: 'step.offline.queue' },
    { from: 'step.offline.detect', type: 'next', to: 'step.offline.banner' },
    { from: 'step.offline.banner', type: 'next', to: 'step.offline.queue', when: 'actionQueued' },

    // Import/export flow
    { from: 'flow.import-export', type: 'contains', to: 'step.import.start' },
    { from: 'flow.import-export', type: 'contains', to: 'step.import.file' },
    { from: 'flow.import-export', type: 'contains', to: 'step.import.confirm' },
    { from: 'flow.import-export', type: 'contains', to: 'step.import.done' },
    { from: 'step.import.start', type: 'next', to: 'step.import.file' },
    { from: 'step.import.file', type: 'next', to: 'step.import.confirm' },
    { from: 'step.import.confirm', type: 'next', to: 'step.import.done', when: 'imported' },

    // Trash/delete flow
    { from: 'flow.trash-delete', type: 'contains', to: 'step.trash.open' },
    { from: 'flow.trash-delete', type: 'contains', to: 'step.trash.confirm' },
    { from: 'flow.trash-delete', type: 'contains', to: 'step.trash.done' },
    { from: 'step.trash.open', type: 'next', to: 'step.trash.confirm' },
    { from: 'step.trash.confirm', type: 'next', to: 'step.trash.done', when: 'confirmed' },

    // Mobile capture flow
    { from: 'flow.mobile-capture', type: 'contains', to: 'step.mobile.capture.start' },
    { from: 'flow.mobile-capture', type: 'contains', to: 'step.mobile.capture.write' },
    { from: 'flow.mobile-capture', type: 'contains', to: 'step.mobile.capture.save' },
    { from: 'step.mobile.capture.start', type: 'next', to: 'step.mobile.capture.write' },
    { from: 'step.mobile.capture.write', type: 'next', to: 'step.mobile.capture.save', when: 'saved' },

    // Mobile match flow
    { from: 'flow.mobile-match', type: 'contains', to: 'step.mobile.match.start' },
    { from: 'flow.mobile-match', type: 'contains', to: 'step.mobile.match.view' },
    { from: 'step.mobile.match.start', type: 'next', to: 'step.mobile.match.view' },

    // Connect capabilities to intents (supports edge: capability -> intent)
    { from: 'cap.network.publish', type: 'supports', to: 'intent.publish-safely' },
    { from: 'cap.data.trash', type: 'supports', to: 'intent.publish-safely' },
    { from: 'cap.network.reply', type: 'supports', to: 'intent.express-need' },
    { from: 'cap.network.explore-feed', type: 'supports', to: 'intent.express-need' },
    { from: 'cap.network.chat', type: 'supports', to: 'intent.express-need' },
    { from: 'cap.network.relay-status', type: 'supports', to: 'intent.publish-safely' },
    { from: 'cap.data.import', type: 'supports', to: 'intent.structured-note' },
    { from: 'cap.data.export', type: 'supports', to: 'intent.structured-note' },
    { from: 'cap.config.theme', type: 'supports', to: 'intent.publish-safely' },
    { from: 'cap.config.density', type: 'supports', to: 'intent.publish-safely' },
    { from: 'cap.config.ai-toggle', type: 'supports', to: 'intent.publish-safely' },
    { from: 'cap.config.profile', type: 'supports', to: 'intent.publish-safely' },
    { from: 'cap.automation.rule', type: 'supports', to: 'intent.express-need' },
    { from: 'cap.automation.scheduled', type: 'supports', to: 'intent.express-need' },
    { from: 'cap.automation.monitor', type: 'supports', to: 'intent.express-need' },

    // Connect steps to surfaces (renders edge: step -> surface)
    { from: 'step.loading.start', type: 'renders', to: 'state.loading' },
    { from: 'step.gp.new-request', type: 'renders', to: 'state.empty' },
    { from: 'step.error.display', type: 'renders', to: 'state.error' },
    { from: 'step.offline.banner', type: 'renders', to: 'state.offline' },
    { from: 'step.offline.banner', type: 'renders', to: 'state.degraded' },
    { from: 'step.gp.match', type: 'renders', to: 'state.no-match' },
];

// Merge new nodes, avoiding duplicates
const existingIds = new Set(graph.nodes.map(n => n.id));
for (const node of [...newNodes, ...newFlows, ...newSteps]) {
    if (!existingIds.has(node.id)) {
        graph.nodes.push(node);
    }
}

// Merge new edges, avoiding duplicates
const existingEdges = new Set(graph.edges.map(e => `${e.from}|${e.type}|${e.to}|${e.when ?? ''}`));
for (const edge of newEdges) {
    const key = `${edge.from}|${edge.type}|${edge.to}|${edge.when ?? ''}`;
    if (!existingEdges.has(key)) {
        graph.edges.push(edge);
    }
}

writeFileSync(graphFile, JSON.stringify(graph, null, 2) + '\n');
console.log(`Graph updated: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
console.log(`Added ${newNodes.length + newFlows.length + newSteps.length} nodes, ${newEdges.length} edges`);