/**
 * Property key inference from terms
 */

export function inferPropertyKey(term: string, category?: string): string {
    const lower = term.toLowerCase();

    // Common mappings - use word boundaries for more precise matching
    if (/\b(rate|price|cost|budget)\b/.test(lower)) return 'price';
    if (/\b(skill|tech|stack)\b/.test(lower)) return 'skills';
    if (/\b(role|job|position|title)\b/.test(lower)) return 'role';
    if (/\b(remote|location|city|country)\b/.test(lower)) return 'location';
    if (/\b(experience|senior|junior|year)\b/.test(lower)) return 'experience';
    if (/\b(deadline|due|schedule|time)\b/.test(lower)) return 'deadline';
    if (/\b(avail|free|open)\b/.test(lower)) return 'availability';
    if (/\b(project|task|work)\b/.test(lower)) return 'project';
    if (category && ['role', 'skills', 'experience', 'budget', 'rate', 'price', 'location', 'remote', 'availability', 'deadline', 'project', 'task', 'intent', 'company', 'title', 'description', 'duration', 'deliveryTime', 'channel', 'from', 'to', 'subject', 'body', 'email', 'phone'].includes(category)) return category;

    return 'keyword';
}

/**
 * Valid ontology property keys that the extractor can recognize
 */
export const VALID_PROPERTY_KEYS = new Set([
    'role', 'skills', 'experience', 'budget', 'rate', 'price', 'location',
    'remote', 'availability', 'deadline', 'project', 'task', 'intent',
    'company', 'title', 'description', 'duration', 'deliveryTime',
    'channel', 'from', 'to', 'subject', 'body', 'email', 'phone',
    'name', 'firstName', 'lastName', 'organization', 'relationships',
    'city', 'country', 'address', 'capacity', 'amenities',
    'eventType', 'status', 'venue', 'organizer', 'cost',
    'meetingType', 'agenda', 'decisions', 'actionItems', 'recurring',
    'employmentType', 'experienceLevel', 'budgetRate',
    'condition', 'category', 'brand', 'sku', 'stock', 'purchasePrice', 'priceRate',
    'name', 'priority', 'tags', 'assignee', 'dueDate', 'estimatedHours', 'actualHours',
]);