import type {Note, Property} from '../types/index.js';

const property = (key: string, values: string[], operator = 'is', role?: 'constraint' | 'fact' | 'marker', unit?: string): Property => ({key, operator, values, role, unit});

const BASE_TIME = new Date('2026-10-20T12:00:00.000Z').getTime();
const HOUR = 60 * 60 * 1000;

const buildNote = (input: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    properties: Property[];
    privacy?: 'public' | 'private';
    offsetHours?: number;
    geo?: {lat: number; lng: number};
}): Note => {
    const updatedAt = new Date(BASE_TIME - (input.offsetHours || 0) * HOUR).toISOString();
    return {
        id: input.id,
        title: input.title,
        content: input.content,
        tags: input.tags,
        properties: input.properties,
        createdAt: updatedAt,
        updatedAt,
        source: {type: 'import', identifier: 'quality-cases', timestamp: BASE_TIME},
        privacy: input.privacy ?? 'public',
        priority: 0.8,
    };
};

const BERLIN = {lat: 52.52, lng: 13.405};
const MUNICH = {lat: 48.137, lng: 11.576};
const HAMBURG = {lat: 53.551, lng: 9.993};

export const QUALITY_CASE_NOTES: Note[] = [
    // Case 001: Wheelchair ramp
    buildNote({
        id: 'note-ramp-001',
        title: 'Wheelchair ramp installation available',
        content: '<p>Experienced contractor offering wheelchair ramp installation. ADA compliant, custom designs.</p>',
        tags: ['offer', 'accessibility', 'construction'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['accessibility', 'construction'], 'is', 'constraint'),
            property('service', ['wheelchair ramp'], 'is', 'constraint'),
            property('rate', ['500', '2000'], 'between', 'constraint', 'USD/project'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-ramp-002',
        title: 'Handyman services - ramps and accessibility',
        content: '<p>General handyman offering accessibility modifications including ramps, grab bars, door widening.</p>',
        tags: ['offer', 'accessibility', 'handyman'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['handyman', 'accessibility'], 'is', 'constraint'),
            property('service', ['wheelchair ramp'], 'is', 'constraint'),
            property('rate', ['50'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),

    // Case 002: Dog walker
    buildNote({
        id: 'note-dog-001',
        title: 'Professional dog walker - weekday mornings',
        content: '<p>Reliable dog walker available Monday-Friday 7-10am. Insured, references available.</p>',
        tags: ['offer', 'pet', 'dog-walking'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['dog walking', 'pet care'], 'is', 'constraint'),
            property('schedule', ['weekday mornings'], 'is', 'constraint'),
            property('rate', ['20', '30'], 'between', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-dog-002',
        title: 'Pet sitting and dog walking services',
        content: '<p>Flexible pet care including dog walking, pet sitting, and check-ins. Weekends also available.</p>',
        tags: ['offer', 'pet', 'pet-sitting'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['pet care', 'dog walking'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('rate', ['25'], 'is', 'constraint', 'USD/visit'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 003: Piano lessons
    buildNote({
        id: 'note-piano-001',
        title: 'Piano teacher for children - weekend availability',
        content: '<p>Experienced piano teacher specializing in children. Weekend slots available. 15+ years experience.</p>',
        tags: ['offer', 'education', 'music', 'piano'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['piano', 'teaching'], 'is', 'constraint'),
            property('audience', ['children'], 'is', 'constraint'),
            property('schedule', ['weekends'], 'is', 'constraint'),
            property('rate', ['40', '60'], 'between', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-piano-002',
        title: 'Music lessons - piano, guitar, violin',
        content: '<p>Multi-instrument teacher offering lessons for all ages. Flexible scheduling including weekends.</p>',
        tags: ['offer', 'education', 'music'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['piano', 'guitar', 'violin', 'teaching'], 'is', 'constraint'),
            property('audience', ['all ages'], 'is', 'constraint'),
            property('schedule', ['flexible', 'weekends'], 'is', 'constraint'),
            property('rate', ['45'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: HAMBURG,
    }),

    // Case 004: Airport ride
    buildNote({
        id: 'note-ride-001',
        title: 'Airport shuttle - early morning specialist',
        content: '<p>Reliable airport transfers 24/7. Specializing in early morning flights (3-6am). Fixed rates, flight tracking.</p>',
        tags: ['offer', 'transport', 'airport'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('service', ['airport transfer', 'ride'], 'is', 'constraint'),
            property('schedule', ['early morning', '24/7'], 'is', 'constraint'),
            property('rate', ['40', '80'], 'between', 'constraint', 'USD/trip'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-ride-002',
        title: 'Rideshare driver - airport runs',
        content: '<p>Experienced driver offering airport transportation. Flexible timing, competitive rates.</p>',
        tags: ['offer', 'transport', 'rideshare'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('service', ['ride', 'airport'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('rate', ['1.5'], 'is', 'constraint', 'USD/km'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 005: Moving help
    buildNote({
        id: 'note-move-001',
        title: 'Moving help with truck - Saturday availability',
        content: '<p>Strong mover with 16ft truck available Saturdays. Loading, unloading, transport. Furniture assembly included.</p>',
        tags: ['offer', 'labor', 'moving'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['moving', 'heavy lifting'], 'is', 'constraint'),
            property('vehicle', ['truck'], 'is', 'constraint'),
            property('schedule', ['Saturday'], 'is', 'constraint'),
            property('rate', ['150', '300'], 'between', 'constraint', 'USD/project'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-move-002',
        title: 'Moving and delivery services',
        content: '<p>Professional moving help. Van available. Weekday and weekend slots. Packing services also offered.</p>',
        tags: ['offer', 'labor', 'moving', 'delivery'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['moving', 'delivery'], 'is', 'constraint'),
            property('vehicle', ['van'], 'is', 'constraint'),
            property('schedule', ['weekdays', 'weekends'], 'is', 'constraint'),
            property('rate', ['40'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 006: Meal delivery for elderly
    buildNote({
        id: 'note-meal-001',
        title: 'Meal delivery service - elderly care, dietary restrictions',
        content: '<p>Specialized meal delivery for seniors. Accommodates low-sodium, diabetic, pureed, gluten-free diets. Daily or weekly plans.</p>',
        tags: ['offer', 'care', 'meal-delivery', 'elderly'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('service', ['meal delivery', 'elderly care'], 'is', 'constraint'),
            property('dietary', ['low-sodium', 'diabetic', 'gluten-free', 'pureed'], 'is', 'constraint'),
            property('schedule', ['daily', 'weekly'], 'is', 'constraint'),
            property('rate', ['10', '15'], 'between', 'constraint', 'USD/meal'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-meal-002',
        title: 'Healthy meal prep and delivery',
        content: '<p>Fresh, healthy meals delivered. Customizable for dietary needs. Senior discounts available.</p>',
        tags: ['offer', 'meal-delivery', 'healthy'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('service', ['meal delivery', 'meal prep'], 'is', 'constraint'),
            property('dietary', ['customizable'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('rate', ['12'], 'is', 'constraint', 'USD/meal'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: HAMBURG,
    }),

    // Case 007: Donate winter coats
    buildNote({
        id: 'note-donate-001',
        title: 'Homeless shelter accepting winter coat donations',
        content: '<p>Local homeless shelter urgently needs winter coats, jackets, blankets. Drop-off daily 9am-6pm. Tax receipt provided.</p>',
        tags: ['offer', 'community', 'donation', 'homeless'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('type', ['donation'], 'is', 'marker'),
            property('item', ['winter coats', 'jackets', 'blankets'], 'is', 'constraint'),
            property('recipient', ['homeless shelter'], 'is', 'constraint'),
            property('schedule', ['daily 9am-6pm'], 'is', 'constraint'),
            property('status', ['accepting'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-donate-002',
        title: 'Winter clothing drive for those in need',
        content: '<p>Community organization collecting winter coats, hats, gloves, scarves for distribution to homeless and low-income families.</p>',
        tags: ['offer', 'community', 'donation', 'winter'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('type', ['donation'], 'is', 'marker'),
            property('item', ['winter coats', 'hats', 'gloves', 'scarves'], 'is', 'constraint'),
            property('recipient', ['homeless', 'low-income families'], 'is', 'constraint'),
            property('schedule', ['weekends'], 'is', 'constraint'),
            property('status', ['accepting'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 008: Spanish conversation practice
    buildNote({
        id: 'note-spanish-001',
        title: 'Native Spanish speaker - conversation practice twice weekly',
        content: '<p>Native Spanish speaker from Madrid offering conversation practice. Tuesdays & Thursdays 6-8pm. All levels welcome.</p>',
        tags: ['offer', 'education', 'language', 'spanish'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['Spanish', 'conversation'], 'is', 'constraint'),
            property('language', ['Spanish'], 'is', 'constraint'),
            property('schedule', ['twice weekly', 'Tuesday', 'Thursday', 'evening'], 'is', 'constraint'),
            property('rate', ['15', '25'], 'between', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-spanish-002',
        title: 'Spanish tutor - flexible schedule',
        content: '<p>Certified Spanish teacher offering 1-on-1 tutoring. Conversation, grammar, exam prep. Online or in-person.</p>',
        tags: ['offer', 'education', 'language', 'spanish', 'tutor'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['Spanish', 'tutoring', 'conversation'], 'is', 'constraint'),
            property('language', ['Spanish'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('rate', ['30'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: HAMBURG,
    }),

    // Case 009: Babysitter Friday night CPR
    buildNote({
        id: 'note-sitter-001',
        title: 'CPR-certified babysitter - Friday nights available',
        content: '<p>Experienced babysitter, CPR & First Aid certified. Available Friday nights 5pm-midnight. References from 5+ families.</p>',
        tags: ['offer', 'care', 'babysitting', 'childcare'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['babysitting', 'childcare', 'CPR'], 'is', 'constraint'),
            property('certification', ['CPR', 'First Aid'], 'is', 'constraint'),
            property('schedule', ['Friday night', 'evening'], 'is', 'constraint'),
            property('rate', ['18', '25'], 'between', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-sitter-002',
        title: 'Professional nanny - evenings and weekends',
        content: '<p>Full-time nanny available for evening/weekend babysitting. CPR certified, early childhood education background.</p>',
        tags: ['offer', 'care', 'babysitting', 'nanny'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['babysitting', 'childcare', 'CPR'], 'is', 'constraint'),
            property('certification', ['CPR'], 'is', 'constraint'),
            property('schedule', ['evenings', 'weekends'], 'is', 'constraint'),
            property('rate', ['22'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 010: Volunteer coding mentorship
    buildNote({
        id: 'note-mentor-001',
        title: 'Free coding mentorship - weekends',
        content: '<p>Senior developer offering free coding mentorship weekends. Web dev, React, Node.js, career guidance. 10+ years exp.</p>',
        tags: ['offer', 'education', 'volunteering', 'coding', 'mentorship'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['coding', 'mentorship', 'web development', 'React', 'Node.js'], 'is', 'constraint'),
            property('price', ['free'], 'is', 'constraint'),
            property('schedule', ['weekends'], 'is', 'constraint'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-mentor-002',
        title: 'Volunteer programming mentor',
        content: '<p>Experienced programmer volunteering to mentor beginners. Python, JavaScript, career advice. Flexible schedule.</p>',
        tags: ['offer', 'education', 'volunteering', 'programming', 'mentorship'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['programming', 'mentorship', 'Python', 'JavaScript'], 'is', 'constraint'),
            property('price', ['free'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 011: Photographer family portraits
    buildNote({
        id: 'note-photo-001',
        title: 'Family portrait photographer - Sunday outdoor sessions',
        content: '<p>Professional family photographer specializing in outdoor Sunday sessions. Natural light, candid style. Package includes 50+ edited photos.</p>',
        tags: ['offer', 'creative', 'photography', 'family', 'portraits'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['photography', 'family portraits'], 'is', 'constraint'),
            property('setting', ['outdoor'], 'is', 'constraint'),
            property('schedule', ['Sunday'], 'is', 'constraint'),
            property('rate', ['200', '400'], 'between', 'constraint', 'USD/session'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-photo-002',
        title: 'Portrait and event photographer',
        content: '<p>Versatile photographer for family portraits, events, headshots. Studio and outdoor. Weekend availability.</p>',
        tags: ['offer', 'creative', 'photography', 'portraits'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['photography', 'portraits', 'events'], 'is', 'constraint'),
            property('setting', ['studio', 'outdoor'], 'is', 'constraint'),
            property('schedule', ['weekends', 'flexible'], 'is', 'constraint'),
            property('rate', ['150'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: HAMBURG,
    }),

    // Case 012: Driving instructor teenager automatic
    buildNote({
        id: 'note-drive-001',
        title: 'Driving instructor - teens, automatic car',
        content: '<p>Patient driving instructor specializing in nervous teenagers. Automatic transmission vehicle. Weekend and after-school slots.</p>',
        tags: ['offer', 'education', 'driving', 'teenager'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['driving instruction', 'teenager'], 'is', 'constraint'),
            property('vehicle', ['automatic'], 'is', 'constraint'),
            property('audience', ['teenager'], 'is', 'constraint'),
            property('schedule', ['weekends', 'after-school'], 'is', 'constraint'),
            property('rate', ['50', '70'], 'between', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-drive-002',
        title: 'Driving lessons - all ages, automatic & manual',
        content: '<p>Certified driving instructor offering lessons in both automatic and manual cars. Flexible scheduling for teens and adults.</p>',
        tags: ['offer', 'education', 'driving'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['driving instruction'], 'is', 'constraint'),
            property('vehicle', ['automatic', 'manual'], 'is', 'constraint'),
            property('audience', ['all ages'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('rate', ['45'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 013: Smart home setup
    buildNote({
        id: 'note-tech-001',
        title: 'Smart home installation - lights, thermostat, locks',
        content: '<p>Smart home specialist. Install and configure smart lights, thermostats, locks, cameras, voice assistants. Same-week service.</p>',
        tags: ['offer', 'tech', 'smart-home', 'installation'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['smart home', 'installation', 'IoT'], 'is', 'constraint'),
            property('device', ['lights', 'thermostat', 'locks', 'cameras'], 'is', 'constraint'),
            property('schedule', ['same-week'], 'is', 'constraint'),
            property('rate', ['200', '500'], 'between', 'constraint', 'USD/project'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-tech-002',
        title: 'Home automation and tech setup',
        content: '<p>Tech-savvy installer for smart home devices. Lights, thermostats, security, entertainment systems. Consultation included.</p>',
        tags: ['offer', 'tech', 'home-automation', 'smart-home'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['home automation', 'smart home', 'installation'], 'is', 'constraint'),
            property('device', ['lights', 'thermostat', 'locks', 'security'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('rate', ['80'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 014: Free coding mentorship weekends (duplicate of 010)
    buildNote({
        id: 'note-mentor-001',
        title: 'Free coding mentorship - weekends',
        content: '<p>Senior developer offering free coding mentorship weekends. Web dev, React, Node.js, career guidance. 10+ years exp.</p>',
        tags: ['offer', 'education', 'volunteering', 'coding', 'mentorship'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['coding', 'mentorship', 'web development', 'React', 'Node.js'], 'is', 'constraint'),
            property('price', ['free'], 'is', 'constraint'),
            property('schedule', ['weekends'], 'is', 'constraint'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-mentor-002',
        title: 'Volunteer programming mentor',
        content: '<p>Experienced programmer volunteering to mentor beginners. Python, JavaScript, career advice. Flexible schedule.</p>',
        tags: ['offer', 'education', 'volunteering', 'programming', 'mentorship'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['programming', 'mentorship', 'Python', 'JavaScript'], 'is', 'constraint'),
            property('price', ['free'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 015: Photographer family portraits Sunday (duplicate of 011)
    buildNote({
        id: 'note-photo-001',
        title: 'Family portrait photographer - Sunday outdoor sessions',
        content: '<p>Professional family photographer specializing in outdoor Sunday sessions. Natural light, candid style. Package includes 50+ edited photos.</p>',
        tags: ['offer', 'creative', 'photography', 'family', 'portraits'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['photography', 'family portraits'], 'is', 'constraint'),
            property('setting', ['outdoor'], 'is', 'constraint'),
            property('schedule', ['Sunday'], 'is', 'constraint'),
            property('rate', ['200', '400'], 'between', 'constraint', 'USD/session'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-photo-002',
        title: 'Portrait and event photographer',
        content: '<p>Versatile photographer for family portraits, events, headshots. Studio and outdoor. Weekend availability.</p>',
        tags: ['offer', 'creative', 'photography', 'portraits'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['photography', 'portraits', 'events'], 'is', 'constraint'),
            property('setting', ['studio', 'outdoor'], 'is', 'constraint'),
            property('schedule', ['weekends', 'flexible'], 'is', 'constraint'),
            property('rate', ['150'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: HAMBURG,
    }),

    // Case 016: Driving instructor teenager automatic (duplicate of 012)
    buildNote({
        id: 'note-drive-001',
        title: 'Driving instructor - teens, automatic car',
        content: '<p>Patient driving instructor specializing in nervous teenagers. Automatic transmission vehicle. Weekend and after-school slots.</p>',
        tags: ['offer', 'education', 'driving', 'teenager'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['driving instruction', 'teenager'], 'is', 'constraint'),
            property('vehicle', ['automatic'], 'is', 'constraint'),
            property('audience', ['teenager'], 'is', 'constraint'),
            property('schedule', ['weekends', 'after-school'], 'is', 'constraint'),
            property('rate', ['50', '70'], 'between', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-drive-002',
        title: 'Driving lessons - all ages, automatic & manual',
        content: '<p>Certified driving instructor offering lessons in both automatic and manual cars. Flexible scheduling for teens and adults.</p>',
        tags: ['offer', 'education', 'driving'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['driving instruction'], 'is', 'constraint'),
            property('vehicle', ['automatic', 'manual'], 'is', 'constraint'),
            property('audience', ['all ages'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('rate', ['45'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 017: Smart home setup (duplicate of 013)
    buildNote({
        id: 'note-tech-001',
        title: 'Smart home installation - lights, thermostat, locks',
        content: '<p>Smart home specialist. Install and configure smart lights, thermostats, locks, cameras, voice assistants. Same-week service.</p>',
        tags: ['offer', 'tech', 'smart-home', 'installation'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['smart home', 'installation', 'IoT'], 'is', 'constraint'),
            property('device', ['lights', 'thermostat', 'locks', 'cameras'], 'is', 'constraint'),
            property('schedule', ['same-week'], 'is', 'constraint'),
            property('rate', ['200', '500'], 'between', 'constraint', 'USD/project'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-tech-002',
        title: 'Home automation and tech setup',
        content: '<p>Tech-savvy installer for smart home devices. Lights, thermostats, security, entertainment systems. Consultation included.</p>',
        tags: ['offer', 'tech', 'home-automation', 'smart-home'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['home automation', 'smart home', 'installation'], 'is', 'constraint'),
            property('device', ['lights', 'thermostat', 'locks', 'security'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('rate', ['80'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 018: Donate winter coats (duplicate of 007)
    buildNote({
        id: 'note-donate-001',
        title: 'Homeless shelter accepting winter coat donations',
        content: '<p>Local homeless shelter urgently needs winter coats, jackets, blankets. Drop-off daily 9am-6pm. Tax receipt provided.</p>',
        tags: ['offer', 'community', 'donation', 'homeless'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('type', ['donation'], 'is', 'marker'),
            property('item', ['winter coats', 'jackets', 'blankets'], 'is', 'constraint'),
            property('recipient', ['homeless shelter'], 'is', 'constraint'),
            property('schedule', ['daily 9am-6pm'], 'is', 'constraint'),
            property('status', ['accepting'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-donate-002',
        title: 'Winter clothing drive for those in need',
        content: '<p>Community organization collecting winter coats, hats, gloves, scarves for distribution to homeless and low-income families.</p>',
        tags: ['offer', 'community', 'donation', 'winter'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('type', ['donation'], 'is', 'marker'),
            property('item', ['winter coats', 'hats', 'gloves', 'scarves'], 'is', 'constraint'),
            property('recipient', ['homeless', 'low-income families'], 'is', 'constraint'),
            property('schedule', ['weekends'], 'is', 'constraint'),
            property('status', ['accepting'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 019: House cleaner biweekly
    buildNote({
        id: 'note-clean-001',
        title: 'Professional house cleaner - biweekly, 3 bed 2 bath',
        content: '<p>Experienced house cleaner available biweekly. Specializes in 3 bed 2 bath homes. Deep cleaning, eco-friendly products. References provided.</p>',
        tags: ['offer', 'home', 'cleaning', 'housekeeping'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['cleaning', 'housekeeping', 'deep cleaning'], 'is', 'constraint'),
            property('property', ['3 bed 2 bath'], 'is', 'constraint'),
            property('schedule', ['biweekly'], 'is', 'constraint'),
            property('rate', ['120', '180'], 'between', 'constraint', 'USD/visit'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-clean-002',
        title: 'House cleaning service - flexible schedule',
        content: '<p>Reliable cleaning service for homes of all sizes. Weekly, biweekly, or monthly. Green cleaning products available.</p>',
        tags: ['offer', 'home', 'cleaning', 'housekeeping'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['cleaning', 'housekeeping'], 'is', 'constraint'),
            property('schedule', ['weekly', 'biweekly', 'monthly', 'flexible'], 'is', 'constraint'),
            property('rate', ['30'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 020: Free resume review
    buildNote({
        id: 'note-resume-001',
        title: 'Free resume review for recent graduates',
        content: '<p>HR professional offering free resume reviews for recent grads. Tech, business, creative fields. Feedback within 48 hours.</p>',
        tags: ['offer', 'career', 'education', 'volunteering', 'resume'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['resume review', 'career coaching', 'HR'], 'is', 'constraint'),
            property('audience', ['recent graduate'], 'is', 'constraint'),
            property('price', ['free'], 'is', 'constraint'),
            property('turnaround', ['48 hours'], 'is', 'constraint'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-resume-002',
        title: 'Volunteer career coach - resume & interview prep',
        content: '<p>Experienced career coach volunteering to help job seekers. Resume review, LinkedIn optimization, mock interviews. Free for students/grads.</p>',
        tags: ['offer', 'career', 'education', 'volunteering', 'coaching'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['career coaching', 'resume review', 'interview prep'], 'is', 'constraint'),
            property('audience', ['students', 'graduates', 'job seekers'], 'is', 'constraint'),
            property('price', ['free'], 'is', 'constraint'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 021: Grocery delivery for elderly
    buildNote({
        id: 'note-grocery-001',
        title: 'Grocery delivery for seniors - weekly or on-demand',
        content: '<p>Personal grocery shopping and delivery for elderly neighbors. Accommodates dietary restrictions, carries to kitchen. Same-day available.</p>',
        tags: ['offer', 'care', 'elderly', 'groceries', 'delivery'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('service', ['grocery delivery', 'shopping', 'elderly assistance'], 'is', 'constraint'),
            property('audience', ['elderly', 'senior'], 'is', 'constraint'),
            property('schedule', ['weekly', 'on-demand', 'same-day'], 'is', 'constraint'),
            property('rate', ['15', '25'], 'between', 'constraint', 'USD/delivery'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-grocery-002',
        title: 'Senior grocery shopping helper',
        content: '<p>Friendly helper for grocery runs. Will shop with you or for you. Carry bags, put away. Flexible timing.</p>',
        tags: ['offer', 'care', 'elderly', 'groceries', 'shopping'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('service', ['grocery shopping', 'elderly assistance'], 'is', 'constraint'),
            property('audience', ['elderly', 'senior'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('rate', ['20'], 'is', 'constraint', 'USD/hour'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),

    // Case 022: Legal help tenants rights free clinic
    buildNote({
        id: 'note-legal-001',
        title: 'Free legal clinic - tenants rights, housing law',
        content: '<p>Pro bono legal clinic every Tuesday 6-8pm. Tenants rights, eviction defense, housing discrimination, repairs. No appointment needed.</p>',
        tags: ['offer', 'legal', 'housing', 'free', 'volunteering', 'clinic'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['legal', 'tenants rights', 'housing law'], 'is', 'constraint'),
            property('type', ['free clinic', 'pro bono'], 'is', 'marker'),
            property('schedule', ['Tuesday 6-8pm'], 'is', 'constraint'),
            property('price', ['free'], 'is', 'constraint'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: BERLIN,
    }),
    buildNote({
        id: 'note-legal-002',
        title: 'Volunteer attorney - housing law, tenant advocacy',
        content: '<p>Licensed attorney volunteering for tenant advocacy. Free consultations for low-income renters. Eviction defense, habitability, deposits.</p>',
        tags: ['offer', 'legal', 'housing', 'free', 'volunteering', 'attorney'],
        properties: [
            property('intent', ['offer'], 'is', 'marker'),
            property('skill', ['legal', 'housing law', 'tenant advocacy', 'eviction defense'], 'is', 'constraint'),
            property('price', ['free'], 'is', 'constraint'),
            property('audience', ['low-income', 'tenants'], 'is', 'constraint'),
            property('schedule', ['flexible'], 'is', 'constraint'),
            property('status', ['available'], 'is', 'marker'),
        ],
        geo: MUNICH,
    }),
];

export const QUALITY_NOTE_IDS: readonly string[] = QUALITY_CASE_NOTES.map(note => note.id);
