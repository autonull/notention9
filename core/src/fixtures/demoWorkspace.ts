import type {Note, Property, PrivacyLevel} from '../types/index.js';

interface DemoNoteInput {
    id: string;
    title: string;
    content: string;
    tags: string[];
    properties: Property[];
    privacy?: PrivacyLevel;
    offsetHours: number;
    geo?: {lat: number; lng: number};
    pinned?: boolean;
    // Relative date offsets (days from now) for date-like properties
    startOffsetDays?: number;
    deadlineOffsetDays?: number;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const property = (key: string, values: string[], operator = 'is', role?: 'constraint' | 'fact' | 'marker', unit?: string): Property => ({key, operator, values, role, unit});

const formatDate = (date: Date): string => date.toISOString().split('T')[0];
const formatDateTime = (date: Date): string => date.toISOString().slice(0, 16);

const buildNote = (
    input: DemoNoteInput,
    now: number
): Note => {
    const updatedAt = new Date(now - input.offsetHours * HOUR).toISOString();
    const properties = [...input.properties];

    // Add relative dates if specified
    if (input.startOffsetDays !== undefined) {
        const startDate = new Date(now + input.startOffsetDays * DAY);
        properties.push(property('start', [formatDateTime(startDate)], 'is', 'constraint'));
    }
    if (input.deadlineOffsetDays !== undefined) {
        const deadlineDate = new Date(now + input.deadlineOffsetDays * DAY);
        properties.push(property('deadline', [formatDate(deadlineDate)], 'is', 'constraint'));
    }

    if (input.geo) {
        properties.push(property('location', [`${input.geo.lat.toFixed(5)},${input.geo.lng.toFixed(5)}`]));
    }
    return {
        id: input.id,
        title: input.title,
        content: input.content,
        tags: input.tags,
        properties,
        createdAt: updatedAt,
        updatedAt,
        source: {type: 'import', identifier: 'sample-workspace', timestamp: now},
        privacy: input.privacy ?? 'private',
        priority: input.pinned ? 1 : 0.8,
        pinned: input.pinned,
    };
};

const BERLIN = {lat: 52.52, lng: 13.405};

const DEMO_NOTES: DemoNoteInput[] = [
    {
        id: 'demo-request-react',
        title: 'Looking for a React developer',
        content: '<p>We are building a small community tool and need help with the interface. Two weeks of work, flexible hours.</p>',
        tags: ['request', 'work'],
        properties: [
            property('intent', ['request'], 'is', 'marker'),
            property('skill', ['React'], 'is', 'constraint'),
            property('rate', ['900', '1200'], 'between', 'constraint', 'USD/project'),
            property('status', ['open'], 'is', 'marker'),
        ],
        privacy: 'public',
        offsetHours: 2,
        geo: BERLIN,
        pinned: true,
    },
    {
        id: 'demo-offer-react',
        title: 'React developer available',
        content: '<p>Frontend developer in Berlin. I can take on a focused two-week project and help shape the interface.</p>',
        tags: ['offer', 'work'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['React'], 'is', 'constraint'),
            property('rate', ['900'], 'is', 'constraint', 'USD/project'),
            property('status', ['available'], 'is', 'marker'),
        ],
        privacy: 'public',
        offsetHours: 5,
        geo: BERLIN,
    },
    {
        id: 'demo-offer-garden',
        title: 'Garden help on Saturdays',
        content: '<p>Happy to help with small garden projects around the neighbourhood. Tools included.</p>',
        tags: ['offer', 'neighbourhood'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['Gardening'], 'is', 'constraint'),
            property('rate', ['25'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        offsetHours: 9,
        geo: {lat: 52.531, lng: 13.384},
    },
    {
        id: 'demo-event-meetup',
        title: 'Community meetup',
        content: '<p>Monthly meetup at the community hall. Bring something you are working on and meet your neighbours.</p>',
        tags: ['event', 'community'],
        properties: [
            property('type', ['event'], 'is', 'marker'),
            property('location', ['Community Hall, Berlin'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 14,
        geo: {lat: 52.512, lng: 13.421},
        startOffsetDays: 10,
    },
    {
        id: 'demo-task-flyers',
        title: 'Print flyers for the meetup',
        content: '<p>Design is ready. Print 100 copies and bring them to the hall on Friday.</p>',
        tags: ['task'],
        properties: [
            property('status', ['todo'], 'is', 'marker'),
            property('type', ['task'], 'is', 'marker'),
        ],
        offsetHours: 20,
        deadlineOffsetDays: 9,
    },
    {
        id: 'demo-person-john',
        title: 'John — neighbourhood gardener',
        content: '<p>John looks after the shared garden and knows everyone on the street. Reach out for plant swaps.</p>',
        tags: ['person', 'community'],
        properties: [
            property('type', ['person'], 'is', 'marker'),
            property('skill', ['Gardening'], 'is', 'constraint'),
            property('status', ['available'], 'is', 'marker'),
        ],
        offsetHours: 26,
        geo: {lat: 52.525, lng: 13.393},
    },
    {
        id: 'demo-item-bike',
        title: 'City bike for sale',
        content: '<p>Three-speed city bike, recently serviced. Pick up in Kreuzberg.</p>',
        tags: ['marketplace'],
        properties: [
            property('type', ['item'], 'is', 'marker'),
            property('price', ['120'], 'is', 'constraint'),
            property('condition', ['good'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 32,
        geo: {lat: 52.497, lng: 13.418},
    },
    {
        id: 'demo-request-tools',
        title: 'Borrow a ladder this weekend',
        content: '<p>Need a stepladder for an hour on Saturday to reach a high shelf. Can pick it up and return it the same day.</p>',
        tags: ['request', 'neighbourhood'],
        properties: [
            property('intent', ['request'], 'is', 'marker'),
            property('item', ['ladder'], 'is', 'constraint'),
            property('status', ['open'], 'is', 'marker'),
        ],
        offsetHours: 38,
        geo: {lat: 52.536, lng: 13.401},
    },
    {
        id: 'demo-journal-week',
        title: 'This week in the neighbourhood',
        content: '<p>Quiet week. Fixed the garden gate, met two new neighbours, and started planning the winter repair day.</p>',
        tags: ['journal'],
        properties: [property('type', ['journal'], 'is', 'marker')],
        offsetHours: 50,
    },
    {
        id: 'demo-note-repair-day',
        title: 'Winter repair day ideas',
        content: '<p>Collect tools, list small repairs, ask who can bring soup. Keep it simple and local.</p>',
        tags: ['idea', 'community'],
        properties: [property('type', ['idea'], 'is', 'marker'), property('status', ['open'], 'is', 'marker')],
        offsetHours: 60,
    },

    // Additional demo events to populate Timeline calendar across current month
    {
        id: 'demo-event-workshop',
        title: 'Community workshop: Home repair basics',
        content: '<p>Learn basic home repair skills. Tools provided. Saturday 10am-2pm at community hall.</p>',
        tags: ['event', 'community', 'workshop'],
        properties: [
            property('type', ['event'], 'is', 'marker'),
            property('location', ['Community Hall, Berlin'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 72,
        geo: {lat: 52.512, lng: 13.421},
        startOffsetDays: 5,
    },
    {
        id: 'demo-event-potluck',
        title: 'Neighbourhood potluck dinner',
        content: '<p>Bring a dish to share. Sunday 6pm at the community garden. All welcome.</p>',
        tags: ['event', 'community', 'social'],
        properties: [
            property('type', ['event'], 'is', 'marker'),
            property('location', ['Community Garden, Berlin'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 96,
        geo: {lat: 52.531, lng: 13.384},
        startOffsetDays: 7,
    },
    {
        id: 'demo-event-tool-share',
        title: 'Tool sharing meetup',
        content: '<p>Bring tools to share or borrow. Wednesday 7pm at the library community room.</p>',
        tags: ['event', 'community', 'sharing'],
        properties: [
            property('type', ['event'], 'is', 'marker'),
            property('location', ['Library Community Room, Berlin'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 120,
        geo: {lat: 52.52, lng: 13.405},
        startOffsetDays: 3,
    },
    {
        id: 'demo-event-cleanup',
        title: 'Street cleanup day',
        content: '<p>Join neighbours for spring street cleanup. Gloves and bags provided. Saturday 9am.</p>',
        tags: ['event', 'community', 'cleanup'],
        properties: [
            property('type', ['event'], 'is', 'marker'),
            property('location', ['Main Street, Berlin'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 144,
        geo: {lat: 52.5, lng: 13.39},
        startOffsetDays: 12,
    },
    {
        id: 'demo-event-seed-swap',
        title: 'Seed and plant swap',
        content: '<p>Trade seeds, seedlings, and gardening tips. Sunday 2pm at the community center.</p>',
        tags: ['event', 'community', 'gardening'],
        properties: [
            property('type', ['event'], 'is', 'marker'),
            property('location', ['Community Center, Berlin'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 168,
        geo: {lat: 52.515, lng: 13.41},
        startOffsetDays: 14,
    },
    {
        id: 'demo-event-bike-repair',
        title: 'Bike repair workshop',
        content: '<p>Learn to fix flats, adjust brakes, and maintain your bike. Thursday 6pm at the bike co-op.</p>',
        tags: ['event', 'community', 'workshop', 'bike'],
        properties: [
            property('type', ['event'], 'is', 'marker'),
            property('location', ['Bike Co-op, Berlin'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 192,
        geo: {lat: 52.49, lng: 13.42},
        startOffsetDays: 10,
    },
    {
        id: 'demo-event-coffee',
        title: 'Neighbourhood coffee morning',
        content: '<p>Casual coffee and chat. Every Tuesday 9am at the corner cafe. No agenda.</p>',
        tags: ['event', 'community', 'social', 'recurring'],
        properties: [
            property('type', ['event'], 'is', 'marker'),
            property('location', ['Corner Cafe, Berlin'], 'is', 'constraint'),
            property('frequency', ['weekly'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 216,
        geo: {lat: 52.525, lng: 13.395},
        startOffsetDays: 2,
    },
    {
        id: 'demo-event-book-club',
        title: 'Community book club',
        content: '<p>Discussing "The Art of Community". First Monday 7pm at the library.</p>',
        tags: ['event', 'community', 'book-club'],
        properties: [
            property('type', ['event'], 'is', 'marker'),
            property('location', ['Library, Berlin'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 240,
        geo: {lat: 52.52, lng: 13.405},
        startOffsetDays: 8,
    },
    {
        id: 'demo-event-repair-cafe',
        title: 'Repair cafe',
        content: '<p>Bring broken items for free repair help. Volunteers welcome. Saturday 10am-4pm.</p>',
        tags: ['event', 'community', 'repair', 'sustainability'],
        properties: [
            property('type', ['event'], 'is', 'marker'),
            property('location', ['Community Workshop, Berlin'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 264,
        geo: {lat: 52.53, lng: 13.39},
        startOffsetDays: 16,
    },
    {
        id: 'demo-event-yoga',
        title: 'Free outdoor yoga',
        content: '<p>All levels welcome. Bring a mat. Monday 7am at the park meadow.</p>',
        tags: ['event', 'community', 'wellness', 'yoga'],
        properties: [
            property('type', ['event'], 'is', 'marker'),
            property('location', ['Park Meadow, Berlin'], 'is', 'constraint'),
            property('frequency', ['weekly'], 'is', 'constraint'),
        ],
        privacy: 'public',
        offsetHours: 288,
        geo: {lat: 52.51, lng: 13.42},
        startOffsetDays: 1,
    },
];

export const buildDemoWorkspace = (now: number | Date = Date.now()): Note[] => {
    const timestamp = typeof now === 'number' ? now : now.getTime();
    return DEMO_NOTES.map(input => buildNote(input, timestamp));
};

export const DEMO_NOTE_IDS: readonly string[] = DEMO_NOTES.map(note => note.id);
