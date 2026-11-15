/**
 * System prompt for property extraction. Derived from the ontology so the key
 * list cannot drift, and aligned with the quality corpus label policy.
 */

import { collectOntologyKeysInTree } from '@notention/core';
import type { OntologyNode } from '@notention/core';

/** Ontology keys live on descendant nodes; `leafOntologyKeys` flattens them. */
export function leafOntologyKeys(ontology: OntologyNode[]): string[] {
    const keys = collectOntologyKeysInTree(ontology) as unknown as Iterable<string>;
    return [...new Set([...keys].map(key => key.split('.').pop() ?? key))].sort();
}

export interface ExtractionExample {
    input: string;
    output: string;
}

export const EXTRACTION_EXAMPLES: readonly ExtractionExample[] = [
    {
        input: 'Meeting with John tomorrow at 10am',
        output: '[{"key":"intent","operator":"is","values":["schedule"]},{"key":"to","operator":"is","values":["John"]}]',
    },
    {
        input: 'Meeting with Sarah at 2pm about the Q4 budget',
        output: '[{"key":"intent","operator":"is","values":["schedule"]},{"key":"to","operator":"is","values":["Sarah"]},{"key":"startTime","operator":"is","values":["2pm"]}]',
    },
    {
        input: 'I need to buy milk and eggs',
        output: '[{"key":"intent","operator":"is","values":["request"]},{"key":"need","operator":"contains","values":["milk","eggs"]}]',
    },
    {
        input: 'Need a wheelchair ramp installed before Friday, budget 900',
        output: '[{"key":"intent","operator":"is","values":["request"]},{"key":"role","operator":"contains","values":["wheelchair ramp"]},{"key":"budget","operator":"less than","values":["900 USD"]}]',
    },
    {
        input: 'looking for a laptop under $1000',
        output: '[{"key":"intent","operator":"is","values":["request"]},{"key":"price","operator":"less than","values":["1000 USD"]}]',
    },
    {
        input: 'maybe we should consider the new proposal',
        output: '[]',
    },
    {
        input: 'I am a software engineer looking for a job',
        output: '[{"key":"role","operator":"is","values":["software engineer"]},{"key":"intent","operator":"is","values":["request"]}]',
    },
    {
        input: 'contact me at john.doe@example.com',
        output: '[{"key":"email","operator":"is","values":["john.doe@example.com"]}]',
    },
    {
        input: 'price equals 100 dollars',
        output: '[{"key":"price","operator":"is","values":["100 USD"]}]',
    },
    {
        input: 'meeting between 2pm and 4pm tomorrow',
        output: '[{"key":"intent","operator":"is","values":["schedule"]},{"key":"startTime","operator":"is","values":["2pm"]},{"key":"endTime","operator":"is","values":["4pm"]}]',
    },
    {
        input: 'call between 3pm and 5pm on Tuesday',
        output: '[{"key":"startTime","operator":"is","values":["3pm"]},{"key":"endTime","operator":"is","values":["5pm"]}]',
    },
    {
        input: 'meeting at the office in San Francisco',
        output: '[{"key":"intent","operator":"is","values":["schedule"]},{"key":"location","operator":"is","values":["San Francisco"]}]',
    },
    {
        input: 'Want to donate winter coats and blankets to the shelter',
        output: '[{"key":"role","operator":"contains","values":["donation"]},{"key":"item","operator":"contains","values":["winter coats","blankets"]}]',
    },
    {
        input: 'Need someone to deliver groceries by 5pm, budget 30',
        output: '[{"key":"role","operator":"contains","values":["delivery"]},{"key":"deadline","operator":"contains","values":["5pm"]},{"key":"budget","operator":"less than","values":["30 USD"]}]',
    },
    {
        input: 'my SSN is 123-45-6789',
        output: '[]',
    },
    // Governance: family evacuation / medical shelter
    {
        input: 'Family evacuation: Need shelter for 4 (infant, elderly, diabetic). Requires insulin storage, power for medical devices, wheelchair accessible. Budget $200/night. Contact: 555-0199.',
        output: '[{"key":"careRequirements","operator":"contains","values":["insulin storage","power for medical devices","wheelchair accessible"]},{"key":"hasMedical","operator":"is","values":["true"]},{"key":"hasPower","operator":"is","values":["true"]},{"key":"capacity","operator":"greater than","values":["4"]},{"key":"budget","operator":"less than","values":["200 USD/night"]},{"key":"emergencyContact","operator":"is","values":["555-0199"]}]',
    },
    // Governance: water rights claim
    {
        input: 'Claimant asserts senior water rights for agricultural use. Quantity: substantial. Priority: senior appropriative. Allocation rule: prior appropriation.',
        output: '[{"key":"role","operator":"is","values":["claimant"]},{"key":"resource","operator":"contains","values":["water-rights"]},{"key":"priority","operator":"contains","values":["senior","appropriative"]},{"key":"quantity","operator":"is","values":["substantial"]},{"key":"allocationRule","operator":"contains","values":["prior-appropriation"]}]',
    },
    // Governance: specialist referral
    {
        input: 'Client needs specialist care for trauma therapy. Trust source: primary provider. Urgency: immediate. Referral quality: high. Feedback loop: closed.',
        output: '[{"key":"role","operator":"is","values":["client"]},{"key":"need","operator":"contains","values":["specialist-care","trauma-therapy"]},{"key":"trustSource","operator":"contains","values":["primary-provider"]},{"key":"urgency","operator":"contains","values":["immediate"]},{"key":"referralQuality","operator":"is","values":["high"]},{"key":"feedbackLoop","operator":"is","values":["closed"]}]',
    },
    // Governance: primary caregiver respite
    {
        input: 'Primary caregiver needs respite care and transport assistance. Care needs: respite, transport. Coordination: shared-calendar. Appreciation: acknowledged. Schedule: weekdays. Financial responsibility: shared.',
        output: '[{"key":"role","operator":"is","values":["primary-caregiver"]},{"key":"careNeed","operator":"contains","values":["respite","transport"]},{"key":"coordination","operator":"is","values":["shared-calendar"]},{"key":"appreciation","operator":"is","values":["acknowledged"]},{"key":"careSchedule","operator":"contains","values":["weekdays"]},{"key":"financialResponsibility","operator":"is","values":["shared"]}]',
    },
    // Governance: verifiable credentials
    {
        input: 'Verifier accepts verifiable credentials and DIDs for employment context. Trust anchors: university-root and dao-root. Presentation: selective disclosure required.',
        output: '[{"key":"role","operator":"is","values":["verifier"]},{"key":"accepts","operator":"contains","values":["verifiable-credential","did"]},{"key":"trustAnchors","operator":"contains","values":["university-root","dao-root"]},{"key":"context","operator":"contains","values":["employment"]},{"key":"presentation","operator":"is","values":["selective-disclosure"]}]',
    },
    // Governance: case worker permits
    {
        input: 'Case worker handles permits and licensing. Authority: delegated. Jurisdiction: municipal. Caseload: standard. Departments: permits, licensing.',
        output: '[{"key":"role","operator":"is","values":["case-worker"]},{"key":"department","operator":"contains","values":["permits","licensing"]},{"key":"authority","operator":"is","values":["delegated"]},{"key":"jurisdiction","operator":"is","values":["municipal"]},{"key":"caseLoad","operator":"is","values":["standard"]}]',
    },
    // Governance: credential holder
    {
        input: 'Credential holder presents university degree and employment history verifiable credentials. Wallet: self-sovereign. Issuers: university and employer.',
        output: '[{"key":"role","operator":"is","values":["credential-holder"]},{"key":"credentials","operator":"contains","values":["degree","employment-history"]},{"key":"issuers","operator":"contains","values":["university","employer"]},{"key":"wallet","operator":"is","values":["self-sovereign"]}]',
    },
    // Governance: task tracking
    {
        input: 'Task: Fix login bug on mobile. Assignee: DevTeam. Priority: high. Due: 2026-11-20. Estimated: 4 hours. Status: in-progress. Actual: 3.5 hours so far.',
        output: '[{"key":"task","operator":"contains","values":["Fix login bug on mobile"]},{"key":"assignee","operator":"is","values":["DevTeam"]},{"key":"priority","operator":"is","values":["high"]},{"key":"dueDate","operator":"before","values":["2026-11-20"]},{"key":"estimatedHours","operator":"is","values":["4"]},{"key":"status","operator":"is","values":["in-progress"]},{"key":"actualHours","operator":"is","values":["3.5"]}]',
    },
];

export function buildSystemPrompt(ontology: OntologyNode[]): string {
    const keys = leafOntologyKeys(ontology).join(', ') || 'none';
    const examples = EXTRACTION_EXAMPLES
        .map(example => `"${example.input}" -> ${example.output}`)
        .join('\n');

    return `You are a precise semantic property extraction system. Output ONLY a JSON array. Do not explain.

Each item has exactly: "key" (from the ontology keys), "operator", and "values" (non-empty string array).

Ontology keys: ${keys}

Label policy — pick the key by the phrase's role, not by a generic word:
- A requested or offered service or provider => "role" with "contains" (tutor, driver, mover, courier, photographer, instructor, mentor). Do not use "need" for a service.
- A physical good => "item" with "contains" (coats, furniture, milk). Do not use "need" for a good.
- A money ceiling ("budget", "under", "up to", "paying") => "budget" with "less than".
- A fixed price, a tag, or free => "price" with "is".
- A time window, day, or recurring schedule ("twice weekly") => "schedule" with "contains".
- An explicit clock range ("2pm to 4pm") => "startTime" and "endTime" with "is".
- A hard cutoff ("before", "by", "due") => "deadline" with "contains".
- Use "location" for a place and "to" for a person.
- Do not emit "description": let the specific keys carry the content.

Modality rules:
- A meeting or appointment => "intent" "is" "schedule". A need/request => "intent" "is" "request".
- Actual facts and events use the real operator "is".
- Desires, needs, requests, and hypotheticals are NOT facts. Use constraint operators: "is not", "contains", "greater than", "less than", "before", "after", "near".
- Mark a need with key "need" and "intent" value "request".
- A pure hypothetical with no concrete constraint returns [].
- Never assert a desire as "is": "I want a cheap laptop" is a constraint ("price less than ..."), not a fact.
- Always include "intent" when the note has a clear intent.

Examples:
${examples}`;
}
