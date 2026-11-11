#!/usr/bin/env npx tsx

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CorpusNote {
  text: string;
  section: string;
  domain: string;
  isRequest: boolean;
  isOffer: boolean;
}

function parseCorpusFile(filePath: string, domain: string): CorpusNote[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const notes: CorpusNote[] = [];
  let currentSection = '';
  let inRequestSection = false;
  let inOfferSection = false;

  // Keywords that indicate request vs offer intent
  const requestKeywords = ['need', 'looking for', 'seeking', 'want', 'require', 'searching for', 'hiring', 'recruit'];
  const offerKeywords = ['offering', 'available', 'providing', 'can help', 'willing to', 'services', 'expertise', 'for hire', 'freelance', 'volunteer'];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('---')) continue;

    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.slice(3).trim();
      const sectionLower = currentSection.toLowerCase();
      inRequestSection = sectionLower.includes('request') || sectionLower.includes('seeking') || sectionLower.includes('looking for') || sectionLower.includes('need');
      inOfferSection = sectionLower.includes('offer') || sectionLower.includes('available') || sectionLower.includes('volunteering') || sectionLower.includes('offering');
      continue;
    }

    if (trimmed.startsWith('# ')) continue;

    if (trimmed && !trimmed.startsWith('#')) {
      const textLower = trimmed.toLowerCase();
      // Infer intent from content if section doesn't clarify
      let isRequest = inRequestSection;
      let isOffer = inOfferSection;
      
      if (!isRequest && !isOffer) {
        const hasRequestKeyword = requestKeywords.some(kw => textLower.includes(kw));
        const hasOfferKeyword = offerKeywords.some(kw => textLower.includes(kw));
        if (hasRequestKeyword && !hasOfferKeyword) isRequest = true;
        else if (hasOfferKeyword && !hasRequestKeyword) isOffer = true;
        // If both or neither, default based on domain patterns
        else if (domain === 'crisis-emergency') {
          // Emergency requests are usually needs
          isRequest = textLower.includes('urgent') || textLower.includes('need') || textLower.includes('emergency');
          isOffer = textLower.includes('offering') || textLower.includes('volunteer') || textLower.includes('available');
        }
      }
      
      notes.push({
        text: trimmed,
        section: currentSection,
        domain,
        isRequest,
        isOffer,
      });
    }
  }

  return notes;
}

function generateNoteId(): string {
  return 'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

function extractProperties(text: string, isRequest: boolean, isOffer: boolean): any[] {
  const properties: any[] = [];
  
  // Add intent property
  if (isRequest) {
    properties.push({
      key: 'intent',
      operator: 'is',
      values: ['request'],
      role: 'marker',
      confidence: 0.9,
      provenance: 'inferred' as const,
    });
  } else if (isOffer) {
    properties.push({
      key: 'intent',
      operator: 'is',
      values: ['offer'],
      role: 'marker',
      confidence: 0.9,
      provenance: 'inferred' as const,
    });
  }

  // Extract rate/budget from text
  const rateMatch = text.match(/(\$?\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:\/|per)\s*(hr|hour|day|week|month|year|project)/i);
  if (rateMatch) {
    const value = parseFloat(rateMatch[1].replace(/,/g, ''));
    const unit = rateMatch[2].toLowerCase();
    const unitMap: Record<string, string> = { hr: 'h', hour: 'h', day: 'd', week: 'wk', month: 'mo', year: 'yr', project: 'project' };
    properties.push({
      key: 'rate',
      operator: 'is',
      values: [`${value} USD/${unitMap[unit] || unit}`],
      unit: `USD/${unitMap[unit] || unit}`,
      quantity: {
        value,
        unit: `USD/${unitMap[unit] || unit}`,
        unitType: 'compound',
        numerator: 'USD',
        denominator: unitMap[unit] || unit,
        semanticType: 'rate',
      },
      role: 'constraint',
      confidence: 0.8,
      provenance: 'pattern' as const,
    });
  }

  // Extract budget/total
  const budgetMatch = text.match(/(?:budget|cost|price|fixed price)[:\s]+\$?(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  if (budgetMatch) {
    const value = parseFloat(budgetMatch[1].replace(/,/g, ''));
    properties.push({
      key: 'budget',
      operator: 'is',
      values: [`${value} USD`],
      unit: 'USD',
      quantity: {
        value,
        unit: 'USD',
        unitType: 'simple',
        numerator: 'USD',
        semanticType: 'price',
      },
      role: 'constraint',
      confidence: 0.8,
      provenance: 'pattern' as const,
    });
  }

  // Extract budget range
  const budgetRangeMatch = text.match(/(?:budget|between)\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*[|-]\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  if (budgetRangeMatch) {
    const min = parseFloat(budgetRangeMatch[1].replace(/,/g, ''));
    const max = parseFloat(budgetRangeMatch[2].replace(/,/g, ''));
    properties.push({
      key: 'budget',
      operator: 'between',
      values: [`${min} USD`, `${max} USD`],
      unit: 'USD',
      quantity: {
        value: (min + max) / 2,
        unit: 'USD',
        unitType: 'simple',
        numerator: 'USD',
        semanticType: 'price',
      },
      role: 'constraint',
      confidence: 0.8,
      provenance: 'pattern' as const,
    });
  }

  // Extract rate range
  const rateRangeMatch = text.match(/(?:rate|between)\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*[|-]\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:\/|per)\s*(hr|hour|day|week|month|year|project)/i);
  if (rateRangeMatch) {
    const min = parseFloat(rateRangeMatch[1].replace(/,/g, ''));
    const max = parseFloat(rateRangeMatch[2].replace(/,/g, ''));
    const unit = rateRangeMatch[3].toLowerCase();
    const unitMap: Record<string, string> = { hr: 'h', hour: 'h', day: 'd', week: 'wk', month: 'mo', year: 'yr', project: 'project' };
    properties.push({
      key: 'rate',
      operator: 'between',
      values: [`${min} USD/${unitMap[unit] || unit}`, `${max} USD/${unitMap[unit] || unit}`],
      unit: `USD/${unitMap[unit] || unit}`,
      quantity: {
        value: (min + max) / 2,
        unit: `USD/${unitMap[unit] || unit}`,
        unitType: 'compound',
        numerator: 'USD',
        denominator: unitMap[unit] || unit,
        semanticType: 'rate',
      },
      role: 'constraint',
      confidence: 0.8,
      provenance: 'pattern' as const,
    });
  }

  // Extract skills/technologies
  const skills = text.match(/(?:React|TypeScript|Node\.js|Python|Go|Rust|GraphQL|Next\.js|Vue\.js|Tailwind|AWS|Docker|Kubernetes|PostgreSQL|Redis|WebRTC|CRDT|Figma|Storybook|Cobra|CLI|VS Code|Electron|Expo|Fastlane|Zod|Jest|Vitest|CockroachDB|gRPC|Terraform|Ansible)/gi);
  if (skills) {
    const uniqueSkills = [...new Set(skills.map(s => s.toLowerCase()))];
    properties.push({
      key: 'skill',
      operator: 'is',
      values: uniqueSkills,
      role: 'constraint',
      confidence: 0.7,
      provenance: 'pattern' as const,
    });
  }

  // Extract location
  const locationMatch = text.match(/(?:remote|onsite|hybrid|Berlin|San Francisco|New York|London|Tokyo|Singapore|Rural area|California|PST)/i);
  if (locationMatch) {
    properties.push({
      key: 'location',
      operator: 'is',
      values: [locationMatch[0]],
      role: 'constraint',
      confidence: 0.6,
      provenance: 'pattern' as const,
    });
  }

  // Extract duration/timeline
  const durationMatch = text.match(/(\d+)\s*(month|week|day|year)s?/i);
  if (durationMatch && !rateMatch) {
    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    const unitMap: Record<string, string> = { month: 'mo', week: 'wk', day: 'd', year: 'yr' };
    properties.push({
      key: 'duration',
      operator: 'is',
      values: [`${value} ${unitMap[unit] || unit}`],
      unit: unitMap[unit] || unit,
      quantity: {
        value,
        unit: unitMap[unit] || unit,
        unitType: 'simple',
        numerator: unitMap[unit] || unit,
        semanticType: 'duration',
      },
      role: 'fact',
      confidence: 0.6,
      provenance: 'pattern' as const,
    });
  }

  // Extract experience level
  if (text.match(/(?:senior|staff|principal|lead|director|junior|entry.level|experienced)/i)) {
    const expMatch = text.match(/(senior|staff|principal|lead|director|junior|entry.level|experienced)/i);
    if (expMatch) {
      properties.push({
        key: 'experienceLevel',
        operator: 'is',
        values: [expMatch[1].toLowerCase()],
        role: 'fact',
        confidence: 0.7,
        provenance: 'pattern' as const,
      });
    }
  }

  return properties;
}

function createNote(corpusNote: CorpusNote, index: number): any {
  const now = new Date();
  const createdAt = new Date(now.getTime() - (Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString();
  
  const properties = extractProperties(corpusNote.text, corpusNote.isRequest, corpusNote.isOffer);
  
  // Determine status based on intent
  let status: any = 'open';
  if (corpusNote.isOffer) status = 'available';
  
  return {
    id: generateNoteId(),
    title: corpusNote.text.slice(0, 80) + (corpusNote.text.length > 80 ? '...' : ''),
    content: corpusNote.text,
    tags: [corpusNote.domain, corpusNote.section.toLowerCase().replace(/\s+/g, '-')],
    properties,
    createdAt,
    updatedAt: createdAt,
    publishedAt: undefined,
    pinned: false,
    deletedAt: undefined,
    nostrEventId: undefined,
    source: {
      type: 'import' as const,
      identifier: `corpus-${corpusNote.domain}`,
      timestamp: Date.now(),
      url: undefined,
    },
    privacy: 'public' as const,
    priority: Math.floor(Math.random() * 5) + 1,
    author: undefined,
    status,
    deadline: undefined,
    commitment: undefined,
    document: undefined,
    contentHtml: undefined,
  };
}

function main() {
  const corpusDir = join(__dirname, '..', 'corpus');
  const outputDir = join(__dirname, '..', 'corpus', 'notes');
  
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const corpusFiles = [
    { file: 'generational.md', domain: 'generational' },
    { file: 'legal-contracts.md', domain: 'legal-contracts' },
    { file: 'crisis-emergency.md', domain: 'crisis-emergency' },
    { file: 'open-source.md', domain: 'open-source' },
    { file: 'mentorship-career.md', domain: 'mentorship-career' },
    { file: 'software-dev.md', domain: 'software-dev' },
    { file: 'food-water.md', domain: 'food-water' },
    { file: 'shelter-energy.md', domain: 'shelter-energy' },
    { file: 'healthcare-medicine.md', domain: 'healthcare-medicine' },
    { file: 'transport-logistics.md', domain: 'transport-logistics' },
    { file: 'education-skills.md', domain: 'education-skills' },
    { file: 'care-community.md', domain: 'care-community' },
    { file: 'tools-materials.md', domain: 'tools-materials' },
    { file: 'arts-culture.md', domain: 'arts-culture' },
  ];

  // Additional synthetic notes per domain to reach ≥200 with messiness
  const syntheticNotes: Record<string, CorpusNote[]> = {
    'generational': [
      { text: 'Need financial advisor for retirement planning, 401k rollover, Roth conversion. Fee-only, fiduciary.', section: 'Retirement & Financial Planning', domain: 'generational', isRequest: true, isOffer: false },
      { text: 'Offering estate planning services: wills, trusts, POA, healthcare directives. Flat fee packages.', section: 'Legal Service Offers', domain: 'generational', isRequest: false, isOffer: true },
      { text: 'Looking for 529 plan advice for grandchild. Tax implications, investment options, state benefits.', section: 'Retirement & Financial Planning', domain: 'generational', isRequest: true, isOffer: false },
      { text: 'Long-term care insurance specialist available. Hybrid policies, traditional, partnership qualified.', section: 'Legal Service Offers', domain: 'generational', isRequest: false, isOffer: true },
      { text: 'Family office setup for multi-gen wealth. Investment policy, governance, philanthropy coordination.', section: 'Generational Business', domain: 'generational', isRequest: true, isOffer: false },
      { text: 'Offering family governance consulting: family council, constitution, next-gen education programs.', section: 'Generational Business', domain: 'generational', isRequest: false, isOffer: true },
      { text: 'Need help with special needs trust for adult child. ABLE account, SSI preservation, trustee selection.', section: 'Family & Caregiving', domain: 'generational', isRequest: true, isOffer: false },
      { text: 'Caregiver support services: respite care coordination, burnout prevention, sibling mediation.', section: 'Family & Caregiving', domain: 'generational', isRequest: false, isOffer: true },
      { text: 'Charitable giving strategy: DAF vs private foundation, impact investing, family involvement.', section: 'Legacy & Impact', domain: 'generational', isRequest: true, isOffer: false },
      { text: 'Family history project: oral interviews, photo digitization, recipe book, digital archive creation.', section: 'Legacy & Impact', domain: 'generational', isRequest: true, isOffer: false },
    ],
    'legal-contracts': [
      { text: 'Need contract review for freelance agreement: IP ownership, payment terms, liability cap, termination.', section: 'Contract Requests', domain: 'legal-contracts', isRequest: true, isOffer: false },
      { text: 'Employment lawyer offering: executive comp, equity packages, separation agreements, non-competes.', section: 'Legal Service Offers', domain: 'legal-contracts', isRequest: false, isOffer: true },
      { text: 'SaaS terms review needed: data privacy, GDPR, SLA, indemnification, limitation of liability.', section: 'Contract Requests', domain: 'legal-contracts', isRequest: true, isOffer: false },
      { text: 'Partnership agreement for consulting LLC: profit sharing, decision making, capital accounts, exit.', section: 'Contract Requests', domain: 'legal-contracts', isRequest: true, isOffer: false },
      { text: 'NDA for acquisition talks: mutual, 3yr term, residual knowledge, permitted disclosures, jurisdiction.', section: 'Contract Requests', domain: 'legal-contracts', isRequest: true, isOffer: false },
      { text: 'Corporate attorney available: entity formation, governance, fundraising, M&A. Startup focus, fixed fee.', section: 'Legal Service Offers', domain: 'legal-contracts', isRequest: false, isOffer: true },
      { text: 'IP lawyer offering: patents, trademarks, copyrights, trade secrets, licensing. Software/biotech exp.', section: 'Legal Service Offers', domain: 'legal-contracts', isRequest: false, isOffer: true },
      { text: 'Data privacy consultant: GDPR, CCPA, HIPAA, SOC2, DPIAs, vendor assessments. CIPP certified.', section: 'Legal Service Offers', domain: 'legal-contracts', isRequest: false, isOffer: true },
      { text: 'SOC2 Type II prep: policy drafting, evidence collection, auditor coordination. 6 month timeline.', section: 'Compliance & Regulatory', domain: 'legal-contracts', isRequest: true, isOffer: false },
      { text: 'HIPAA compliance for health tech: BAA mgmt, risk assessment, training, breach response, encryption.', section: 'Compliance & Regulatory', domain: 'legal-contracts', isRequest: true, isOffer: false },
    ],
    'crisis-emergency': [
      { text: 'URGENT: Emergency shelter needed for family of 4 after house fire. Red Cross contacted, need housing.', section: 'Emergency Requests', domain: 'crisis-emergency', isRequest: true, isOffer: false },
      { text: 'Medical emergency: parent needs surgery, need caregiver for kids (3, 6) for 2 weeks. Can pay.', section: 'Emergency Requests', domain: 'crisis-emergency', isRequest: true, isOffer: false },
      { text: 'Flood evacuation: transport for elderly neighbor (85) + wheelchair. Shelter 10 miles at community center.', section: 'Emergency Requests', domain: 'crisis-emergency', isRequest: true, isOffer: false },
      { text: 'Power outage 72hrs: need generator for medical equipment (CPAP, refrigerated meds). Rural area.', section: 'Emergency Requests', domain: 'crisis-emergency', isRequest: true, isOffer: false },
      { text: 'Water contamination: boil notice 30 days. Need bulk water for household of 6 including infant formula.', section: 'Emergency Requests', domain: 'crisis-emergency', isRequest: true, isOffer: false },
      { text: 'CERT trained responder offering: first aid/CPR, own transport, available 24/7 for local disasters.', section: 'Volunteer Offers', domain: 'crisis-emergency', isRequest: false, isOffer: true },
      { text: 'Therapist offering crisis counseling: trauma-informed, grief support, free for disaster victims. Telehealth.', section: 'Volunteer Offers', domain: 'crisis-emergency', isRequest: false, isOffer: true },
      { text: 'Construction crew volunteering: 5 people, tools, debris removal, temp repairs, tarping. Weekends.', section: 'Volunteer Offers', domain: 'crisis-emergency', isRequest: false, isOffer: true },
      { text: 'Food bank coordinator: bulk food distribution, dietary restrictions, delivery to homebound. 20 volunteers.', section: 'Volunteer Offers', domain: 'crisis-emergency', isRequest: false, isOffer: true },
      { text: 'Ham radio operator: emergency comms, backup when cell down, ARES/RACES. Mobile and base station.', section: 'Volunteer Offers', domain: 'crisis-emergency', isRequest: false, isOffer: true },
    ],
    'open-source': [
      { text: 'Looking for contributors: issue triage, bug fixes, docs. React + TS project, 50k weekly downloads.', section: 'Project Maintenance', domain: 'open-source', isRequest: true, isOffer: false },
      { text: 'Maintainer seeking co-maintainers for CLI tool. Go, Cobra, 10k stars. Releases, reviews, community.', section: 'Project Maintenance', domain: 'open-source', isRequest: true, isOffer: false },
      { text: 'Design system contributors needed: Figma, Storybook, React, a11y expertise welcome.', section: 'Project Maintenance', domain: 'open-source', isRequest: true, isOffer: false },
      { text: 'Security library needs auditors and contributors. Rust, crypto, formal verification a plus.', section: 'Project Maintenance', domain: 'open-source', isRequest: true, isOffer: false },
      { text: 'Documentation sprint: guides, API docs, tutorials for GraphQL framework. Technical writers welcome.', section: 'Project Maintenance', domain: 'open-source', isRequest: true, isOffer: false },
      { text: 'Want to contribute to TypeScript compiler. Need good-first-issues and mentorship.', section: 'Contribution Requests', domain: 'open-source', isRequest: true, isOffer: false },
      { text: 'Interested in contributing to React core. Guidance on codebase, testing, PR process.', section: 'Contribution Requests', domain: 'open-source', isRequest: true, isOffer: false },
      { text: 'Looking to contribute to VS Code extensions. TS, Electron, extension API experience.', section: 'Contribution Requests', domain: 'open-source', isRequest: true, isOffer: false },
      { text: 'Good first issue: Add TS types for undocumented config options. Friendly maintainers, quick review.', section: 'Good First Issues', domain: 'open-source', isRequest: false, isOffer: true },
      { text: 'Help wanted: Improve error messages for invalid CLI args. Go project, well-scoped, beginner friendly.', section: 'Good First Issues', domain: 'open-source', isRequest: false, isOffer: true },
    ],
    'mentorship-career': [
      { text: 'Looking for senior software architect mentor: system design, scalability. Monthly 1hr, $200/session.', section: 'Mentorship Requests', domain: 'mentorship-career', isRequest: true, isOffer: false },
      { text: 'Seeking career mentor: IC to EM transition. Leadership, delegation, strategy guidance.', section: 'Mentorship Requests', domain: 'mentorship-career', isRequest: true, isOffer: false },
      { text: 'Want mentor experienced in startup CTO role: tech strategy, fundraising, hiring, culture. Equity/cash.', section: 'Mentorship Requests', domain: 'mentorship-career', isRequest: true, isOffer: false },
      { text: 'Looking for Rust expert mentor: systems programming, async, performance. Weekly pair programming.', section: 'Mentorship Requests', domain: 'mentorship-career', isRequest: true, isOffer: false },
      { text: 'Need guidance on technical writing and dev advocacy: personal brand, speaking, content creation.', section: 'Mentorship Requests', domain: 'mentorship-career', isRequest: true, isOffer: false },
      { text: 'Senior EM offering mentorship: career growth, leadership, org design, perf reviews. 10yr exp. Free for URG.', section: 'Mentorship Offers', domain: 'mentorship-career', isRequest: false, isOffer: true },
      { text: 'Staff engineer available: system architecture, code review, tech decisions, staff+ promo packets. $150/hr.', section: 'Mentorship Offers', domain: 'mentorship-career', isRequest: false, isOffer: true },
      { text: 'Eng director offering executive coaching: strategy, stakeholder mgmt, hiring at scale, culture. $300/hr.', section: 'Mentorship Offers', domain: 'mentorship-career', isRequest: false, isOffer: true },
      { text: 'OS maintainer mentoring contributors: first PR, code review, governance, community building. Free.', section: 'Mentorship Offers', domain: 'mentorship-career', isRequest: false, isOffer: true },
      { text: 'Principal engineer mentoring: distributed systems, consensus, DB internals. Academic, 15yr industry. $250/hr.', section: 'Mentorship Offers', domain: 'mentorship-career', isRequest: false, isOffer: true },
    ],
    'software-dev': [
      { text: 'Need React developer for 3-month project, budget $15k, remote. TS, Next.js, GraphQL required.', section: 'Project Requests', domain: 'software-dev', isRequest: true, isOffer: false },
      { text: 'Freelance frontend engineer for dashboard: React, Tailwind, Recharts. Rate $80-120/hr. Start ASAP.', section: 'Project Requests', domain: 'software-dev', isRequest: true, isOffer: false },
      { text: 'Full-stack dev for e-commerce: Node.js, React, PostgreSQL. 6-month contract, $10k/month.', section: 'Project Requests', domain: 'software-dev', isRequest: true, isOffer: false },
      { text: 'DevOps engineer for K8s migration: AWS, Docker, Terraform. $150/hr, 3 months.', section: 'Project Requests', domain: 'software-dev', isRequest: true, isOffer: false },
      { text: 'Mobile dev for React Native app: iOS/Android, push notifications, offline sync. $5k fixed.', section: 'Project Requests', domain: 'software-dev', isRequest: true, isOffer: false },
      { text: 'Senior React Developer offering: TS, Next.js, Redux, Testing Library. $110/hr. Full-time remote.', section: 'Job Offers', domain: 'software-dev', isRequest: false, isOffer: true },
      { text: 'Full-stack engineer available: Node.js, Python, React, AWS, Docker. 8yr exp. $100/hr.', section: 'Job Offers', domain: 'software-dev', isRequest: false, isOffer: true },
      { text: 'Frontend specialist: Vue.js, Nuxt, Pinia, Vitest, Tailwind. $90/hr. Part-time available.', section: 'Job Offers', domain: 'software-dev', isRequest: false, isOffer: true },
      { text: 'Backend dev: Go, PostgreSQL, gRPC, Kubernetes. $120/hr. Contract or full-time.', section: 'Job Offers', domain: 'software-dev', isRequest: false, isOffer: true },
      { text: 'Mobile dev: React Native, Expo, TypeScript, Fastlane. $95/hr. Immediate availability.', section: 'Job Offers', domain: 'software-dev', isRequest: false, isOffer: true },
    ],
    'food-water': [
      { text: 'Need organic vegetable delivery: weekly CSA box, seasonal, local farm. $50/week, pickup or delivery.', section: 'Food Requests', domain: 'food-water', isRequest: true, isOffer: false },
      { text: 'Offering backyard eggs: pasture-raised hens, $8/dozen, pickup Fridays. Duck eggs occasionally.', section: 'Food Offers', domain: 'food-water', isRequest: false, isOffer: true },
      { text: 'Seeking raw milk herd share: A2 Jersey cows, tested monthly, $50/month for 1 gal/week.', section: 'Food Requests', domain: 'food-water', isRequest: true, isOffer: false },
      { text: 'Home baker offering sourdough: country loaf, baguettes, cinnamon rolls. $8/loaf, weekly pickup.', section: 'Food Offers', domain: 'food-water', isRequest: false, isOffer: true },
      { text: 'Need bulk grains: 50lb organic wheat berries, oats, rice, beans. Food grade buckets, delivery.', section: 'Food Requests', domain: 'food-water', isRequest: true, isOffer: false },
      { text: 'Spring water delivery: 5-gal glass jugs, local source, $7/jug, monthly subscription.', section: 'Water Offers', domain: 'food-water', isRequest: false, isOffer: true },
      { text: 'Looking for rainwater system: 1500 gal tanks, filtration, irrigation, potable option. Quote needed.', section: 'Water Requests', domain: 'food-water', isRequest: true, isOffer: false },
      { text: 'Well water testing & treatment: iron, sulfur, bacteria. Licensed, guaranteed results.', section: 'Water Offers', domain: 'food-water', isRequest: false, isOffer: true },
      { text: 'Heirloom seed saver: 100+ tomato varieties, peppers, beans, corn. Seed swap or purchase.', section: 'Agriculture Offers', domain: 'food-water', isRequest: false, isOffer: true },
      { text: 'Market garden mentor: 1-acre intensive, no-till, season extension. Hands-on apprenticeship.', section: 'Agriculture Offers', domain: 'food-water', isRequest: false, isOffer: true },
    ],
    'shelter-energy': [
      { text: 'Seeking affordable rental: 2BR, near transit, under $1500, cat-friendly, in-unit laundry.', section: 'Housing Requests', domain: 'shelter-energy', isRequest: true, isOffer: false },
      { text: 'Landlord offering 2BR apt: near subway, renovated, heat/hot water included. $1400/month.', section: 'Housing Offers', domain: 'shelter-energy', isRequest: false, isOffer: true },
      { text: 'Need off-grid solar: 5kW panels, 20kWh battery, inverter, install. Budget $25k.', section: 'Energy Requests', domain: 'shelter-energy', isRequest: true, isOffer: false },
      { text: 'Solar installer: design, permit, install, maintenance. 15yrs, NABCEP, 500+ systems. Free quote.', section: 'Energy Offers', domain: 'shelter-energy', isRequest: false, isOffer: true },
      { text: 'Looking for tiny house land: 0.25 acre, hookups, permissive zoning. Long-term lease.', section: 'Housing Requests', domain: 'shelter-energy', isRequest: true, isOffer: false },
      { text: 'Tiny house community pad: hookups, shared bathhouse, common house. $400/month pad fee.', section: 'Housing Offers', domain: 'shelter-energy', isRequest: false, isOffer: true },
      { text: 'Need heat pump: 3-zone mini-split, cold climate, rebates. 2000 sq ft, existing ductwork.', section: 'Energy Requests', domain: 'shelter-energy', isRequest: true, isOffer: false },
      { text: 'HVAC contractor: Mitsubishi Diamond Dealer, heat pumps, geothermal, mini-splits. Free estimate.', section: 'Energy Offers', domain: 'shelter-energy', isRequest: false, isOffer: true },
      { text: 'Seeking reclaimed lumber: barn beams, wide plank flooring, vintage doors. Character, sustainability.', section: 'Construction & Materials Requests', domain: 'shelter-energy', isRequest: true, isOffer: false },
      { text: 'Sawyer offering local lumber: oak, pine, cedar, walnut. Rough-sawn, kiln-dried, custom cuts.', section: 'Construction & Materials Offers', domain: 'shelter-energy', isRequest: false, isOffer: true },
    ],
    'healthcare-medicine': [
      { text: 'Need primary care: accepting Medicaid, near transit, adult & pediatric. Telehealth ok.', section: 'Healthcare Requests', domain: 'healthcare-medicine', isRequest: true, isOffer: false },
      { text: 'Family physician: DPC model, $75/mo, unlimited visits, wholesale labs/meds. Accepting patients.', section: 'Healthcare Offers', domain: 'healthcare-medicine', isRequest: false, isOffer: true },
      { text: 'Seeking therapist: trauma, EMDR, somatic, sliding scale. Evening/weekend availability.', section: 'Healthcare Requests', domain: 'healthcare-medicine', isRequest: true, isOffer: false },
      { text: 'Therapist: CBT, DBT, ACT, EMDR. $120/session, sliding scale, superbill. Telehealth.', section: 'Healthcare Offers', domain: 'healthcare-medicine', isRequest: false, isOffer: true },
      { text: 'Need functional medicine: root cause, nutrition, hormones, gut. Longer visits, lab review.', section: 'Healthcare Requests', domain: 'healthcare-medicine', isRequest: true, isOffer: false },
      { text: 'Functional medicine: 90-min intake, advanced testing, personalized protocol. Membership.', section: 'Healthcare Offers', domain: 'healthcare-medicine', isRequest: false, isOffer: true },
      { text: 'Need postpartum doula: overnight, breastfeeding, newborn care, sibling support. 4-12 weeks.', section: 'Care Requests', domain: 'healthcare-medicine', isRequest: true, isOffer: false },
      { text: 'Postpartum doula: DONA, lactation counselor, newborn care specialist. Night/day packages.', section: 'Care Offers', domain: 'healthcare-medicine', isRequest: false, isOffer: true },
      { text: 'Looking for eldercare companion: dementia experience, med reminders, walks, meals. 4hrs/day.', section: 'Care Requests', domain: 'healthcare-medicine', isRequest: true, isOffer: false },
      { text: 'Eldercare companion: CNA, dementia certified, validation therapy, music/memory. $28/hr.', section: 'Care Offers', domain: 'healthcare-medicine', isRequest: false, isOffer: true },
    ],
    'transport-logistics': [
      { text: 'Need daily carpool: 30mi commute, 7am/5pm, HOV lane, split gas. 3 seats available.', section: 'Transport Requests', domain: 'transport-logistics', isRequest: true, isOffer: false },
      { text: 'Carpool driver: 3 seats, 30mi, HOV, $150/mo. 7am sharp, 5:15pm return. Reliable.', section: 'Transport Offers', domain: 'transport-logistics', isRequest: false, isOffer: true },
      { text: 'Need freight shipping: pallet machinery 500lbs, NYC to LA, LTL, liftgate, inside delivery.', section: 'Transport Requests', domain: 'transport-logistics', isRequest: true, isOffer: false },
      { text: 'Freight broker: LTL/FTL/hotshot, 98% on-time, cargo insured, tracking. Transparent pricing.', section: 'Transport Offers', domain: 'transport-logistics', isRequest: false, isOffer: true },
      { text: 'Seeking last-mile delivery: 50 packages/day, 2hr windows, POD photos. E-commerce fulfillment.', section: 'Logistics Requests', domain: 'transport-logistics', isRequest: true, isOffer: false },
      { text: 'Last-mile carrier: 50 vans, route optimization, real-time tracking, POD. $3.50/package.', section: 'Logistics Offers', domain: 'transport-logistics', isRequest: false, isOffer: true },
      { text: 'Need accessible van: side entry, ramp, tie-downs, 1 passenger + driver. Purchase or lease.', section: 'Mobility Requests', domain: 'transport-logistics', isRequest: true, isOffer: false },
      { text: 'Accessible van dealer: BraunAbility, VMI, Sienna, Pacifica. Demo, financing, service.', section: 'Mobility Offers', domain: 'transport-logistics', isRequest: false, isOffer: true },
      { text: 'Looking for e-bike: cargo, longtail, 50+ mile range, child seat. Test ride first.', section: 'Mobility Requests', domain: 'transport-logistics', isRequest: true, isOffer: false },
      { text: 'E-bike shop: Tern, Yuba, Rad, Urban Arrow. Test rides, financing, service, cargo accessories.', section: 'Mobility Offers', domain: 'transport-logistics', isRequest: false, isOffer: true },
    ],
    'education-skills': [
      { text: 'Need tutor: HS math (algebra, geometry, calculus), 2x/week, virtual ok. $50/hr.', section: 'Education Requests', domain: 'education-skills', isRequest: true, isOffer: false },
      { text: 'Math tutor: PhD, 15yrs, AP/IB/SAT/ACT, contest prep. $75/hr, sliding scale.', section: 'Education Offers', domain: 'education-skills', isRequest: false, isOffer: true },
      { text: 'Seeking coding bootcamp: full-stack JS/React/Node, job placement, part-time. ISA or loan.', section: 'Education Requests', domain: 'education-skills', isRequest: true, isOffer: false },
      { text: 'Coding mentor: senior engineer, FAANG, system design, interviews, career coaching. $100/hr.', section: 'Education Offers', domain: 'education-skills', isRequest: false, isOffer: true },
      { text: 'Need to learn: Python data analysis, pandas, viz, Jupyter. Project-based, 8 weeks.', section: 'Skills Requests', domain: 'education-skills', isRequest: true, isOffer: false },
      { text: 'Data science mentor: Kaggle Grandmaster, Python/R/SQL, ML/DL, portfolio review. $80/hr.', section: 'Skills Offers', domain: 'education-skills', isRequest: false, isOffer: true },
      { text: 'Seeking PM coach: PMP, Agile/Scrum, Jira, stakeholder mgmt. Certification prep.', section: 'Skills Requests', domain: 'education-skills', isRequest: true, isOffer: false },
      { text: 'PM coach: PMP, PMI-ACP, SAFe, 20yrs tech, mock exams, application review. $100/hr.', section: 'Skills Offers', domain: 'education-skills', isRequest: false, isOffer: true },
      { text: 'Need research help: systematic review, meta-analysis, literature search, Zotero. Academic.', section: 'Knowledge Requests', domain: 'education-skills', isRequest: true, isOffer: false },
      { text: 'Research analyst: PhD, PubMed/Scopus/WoS, systematic reviews, R/Python. $100/hr.', section: 'Knowledge Offers', domain: 'education-skills', isRequest: false, isOffer: true },
    ],
    'care-community': [
      { text: 'Need infant care: 3mo, M-F 7:30-5:30, cloth diapers, breastmilk. Licensed home preferred.', section: 'Childcare Requests', domain: 'care-community', isRequest: true, isOffer: false },
      { text: 'Licensed home daycare: 6 kids max, 0-5yrs, Reggio-inspired, organic meals, outdoor classroom. $1400/mo.', section: 'Childcare Offers', domain: 'care-community', isRequest: false, isOffer: true },
      { text: 'Seeking companion for mother (82): conversation, walks, meals, med reminders. Dementia exp.', section: 'Eldercare Requests', domain: 'care-community', isRequest: true, isOffer: false },
      { text: 'Companion caregiver: CNA, 15yrs, dementia certified, validation therapy, music/memory. $28/hr.', section: 'Eldercare Offers', domain: 'care-community', isRequest: false, isOffer: true },
      { text: 'New to area, seeking neighbors: potlucks, tool sharing, childcare swap. Walkable neighborhood.', section: 'Community Requests', domain: 'care-community', isRequest: true, isOffer: false },
      { text: 'Neighborhood host: monthly potluck, tool library, seed swap, kid swap, block party. All welcome.', section: 'Community Offers', domain: 'care-community', isRequest: false, isOffer: true },
      { text: 'Seeking friendship: 30s, queer, neurodivergent, board games, hiking, deep talks. Low pressure.', section: 'Relationship Requests', domain: 'care-community', isRequest: true, isOffer: false },
      { text: 'Friend seeker: 35, ENTP, hiker, cook, reader, listener. Coffee, trails, deep dives. Open.', section: 'Relationship Offers', domain: 'care-community', isRequest: false, isOffer: true },
      { text: 'Need accountability buddy: writing, exercise, meditation, business, daily check-in. Structured.', section: 'Relationship Requests', domain: 'care-community', isRequest: true, isOffer: false },
      { text: 'Accountability partner: writer, 6am check-in, sprints, weekly review, quarterly retreat. Mutual.', section: 'Relationship Offers', domain: 'care-community', isRequest: false, isOffer: true },
    ],
    'tools-materials': [
      { text: 'Need table saw: cabinet, 3HP, 52" fence, dust collection. SawStop or Powermatic, used ok.', section: 'Tools Requests', domain: 'tools-materials', isRequest: true, isOffer: false },
      { text: 'Cabinet saw: SawStop PCS 3HP, 52" T-glide, mobile base, $2800. Light use, 2yrs old.', section: 'Tools Offers', domain: 'tools-materials', isRequest: false, isOffer: true },
      { text: 'Seeking tractor: 25-35HP, 4WD, loader, backhoe, mid-PTO, cab/heat. Kubota, JD, Yanmar.', section: 'Equipment Requests', domain: 'tools-materials', isRequest: true, isOffer: false },
      { text: 'Compact tractor: Kubota L3301, 33HP, 4WD, LA525 loader, 540 PTO, ROPS. $25k, 200hrs.', section: 'Equipment Offers', domain: 'tools-materials', isRequest: false, isOffer: true },
      { text: 'Need hardwood: walnut, maple, cherry, oak, 4/4-8/4, 100+ BF. Kiln-dried, surfaced.', section: 'Materials Requests', domain: 'tools-materials', isRequest: true, isOffer: false },
      { text: 'Hardwood dealer: walnut, maple, cherry, white oak, 4/4-16/4, live edge, kiln-dried. $8-18/BF.', section: 'Materials Offers', domain: 'tools-materials', isRequest: false, isOffer: true },
      { text: 'Need appliance repair: fridge, washer, dryer, oven, dishwasher. Same-day, warranty, all brands.', section: 'Repair Requests', domain: 'tools-materials', isRequest: true, isOffer: false },
      { text: 'Appliance tech: factory trained, all brands, same-day, 90-day warranty, transparent. $89 diag.', section: 'Repair Offers', domain: 'tools-materials', isRequest: false, isOffer: true },
      { text: 'Seeking auto repair: engine, transmission, brakes, suspension, electrical, EV/Hybrid. Honest, certified.', section: 'Repair Requests', domain: 'tools-materials', isRequest: true, isOffer: false },
      { text: 'Auto shop: ASE master, EV certified, digital inspection, loaner, 3yr/36k warranty. Honest pricing.', section: 'Repair Offers', domain: 'tools-materials', isRequest: false, isOffer: true },
    ],
    'arts-culture': [
      { text: 'Need mural artist: exterior 20x30ft, community theme, weather-resistant, 2-week timeline. $5000.', section: 'Arts Requests', domain: 'arts-culture', isRequest: true, isOffer: false },
      { text: 'Muralist: 20+ public murals, exterior/interior, community engagement, lift/insurance. $25/sq ft.', section: 'Arts Offers', domain: 'arts-culture', isRequest: false, isOffer: true },
      { text: 'Seeking language teacher: Indigenous language, immersion, community classes, elder speakers. Grant-funded.', section: 'Culture Requests', domain: 'arts-culture', isRequest: true, isOffer: false },
      { text: 'Language revitalization: immersion nest, master-apprentice, curriculum, documentation, tech. Grant-funded.', section: 'Culture Offers', domain: 'arts-culture', isRequest: false, isOffer: true },
      { text: 'Need wedding officiant: interfaith, secular, spiritual, custom ceremony, rehearsal, license. $300-600.', section: 'Ritual Requests', domain: 'arts-culture', isRequest: true, isOffer: false },
      { text: 'Celebrant: weddings, funerals, namings, blessings, divorces, transitions, all faiths/none. $300-800.', section: 'Ritual Offers', domain: 'arts-culture', isRequest: false, isOffer: true },
      { text: 'Seeking game night host: board games, TTRPG, card, social deduction, weekly, inclusive. Snacks.', section: 'Play Requests', domain: 'arts-culture', isRequest: true, isOffer: false },
      { text: 'Game cafe: 500+ games, TTRPG library, food/drink, events, private rooms, membership. $5/hr.', section: 'Play Offers', domain: 'arts-culture', isRequest: false, isOffer: true },
      { text: 'Need D&D group: 5e/PF2e/OSR, weekly, roleplay-heavy, safety tools, LGBTQ+ friendly. Experienced DM.', section: 'Play Requests', domain: 'arts-culture', isRequest: true, isOffer: false },
      { text: 'D&D DM: professional, 10yrs, custom worlds, safety tools, virtual/in-person, 4-6 players. $25/player/session.', section: 'Play Offers', domain: 'arts-culture', isRequest: false, isOffer: true },
    ],
  };

  const allNotes: any[] = [];
  const manifest: any = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    domains: {} as Record<string, any>,
    totalNotes: 0,
    provenance: {
      source: 'self-authored corpus',
      license: 'CC0-1.0',
      description: 'Synthetic corpus for match quality evaluation. No third-party personal data.',
      domains: [
        'generational',
        'legal-contracts',
        'crisis-emergency',
        'open-source',
        'mentorship-career',
        'software-dev',
        'food-water',
        'shelter-energy',
        'healthcare-medicine',
        'transport-logistics',
        'education-skills',
        'care-community',
        'tools-materials',
        'arts-culture',
      ],
    },
  };

  for (const { file, domain } of corpusFiles) {
    const filePath = join(corpusDir, file);
    const corpusNotes = parseCorpusFile(filePath, domain);
    
    // Add synthetic notes for this domain
    const additionalNotes = syntheticNotes[domain] || [];
    const allDomainNotes = [...corpusNotes, ...additionalNotes];
    
    const domainNotes = allDomainNotes.map((cn, i) => createNote(cn, i));
    allNotes.push(...domainNotes);
    
    // Write domain-specific file
    const domainOutputPath = join(outputDir, `${domain}.json`);
    writeFileSync(domainOutputPath, JSON.stringify(domainNotes, null, 2));
    
    manifest.domains[domain] = {
      file: `${domain}.json`,
      noteCount: domainNotes.length,
      sections: [...new Set(allDomainNotes.map(cn => cn.section))],
    };
    
    console.log(`${domain}: ${domainNotes.length} notes`);
  }

  // Write combined corpus
  const combinedPath = join(outputDir, 'corpus.json');
  writeFileSync(combinedPath, JSON.stringify(allNotes, null, 2));
  
  // Write manifest
  manifest.totalNotes = allNotes.length;
  const manifestPath = join(outputDir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`\nTotal: ${allNotes.length} notes`);
  console.log(`Output: ${outputDir}`);
  console.log(`Manifest: ${manifestPath}`);
}

main();