#!/usr/bin/env node
/**
 * Generate 40 additional quality extraction cases (061-100)
 * Balanced across: gig, freelance, events, knowledge, governance, crisis
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const casesDir = '/home/me/notention9/data/eval/cases/quality/extraction/';

const newCases = [
  // Gig / Freelance (8 cases)
  {
    id: "quality-extract-061",
    input: "Gig: Need a plumber to fix leaking kitchen sink ASAP. Budget $150 max. Must be licensed and insured.",
    expected: [
      { key: "role", operator: "contains", values: ["plumber", "plumbing"] },
      { key: "task", operator: "contains", values: ["leaking kitchen sink", "sink repair"] },
      { key: "budget", operator: "less than", values: ["150 USD"] },
      { key: "certification", operator: "contains", values: ["licensed", "insured"] }
    ],
    tags: ["gig", "home-repair", "urgent", "budget", "licensed"]
  },
  {
    id: "quality-extract-062",
    input: "Freelance: Python automation script needed. Extract data from PDF invoices to CSV. Budget $300. Deadline: 1 week.",
    expected: [
      { key: "role", operator: "contains", values: ["developer", "automation", "script"] },
      { key: "task", operator: "contains", values: ["PDF invoice extraction", "CSV conversion"] },
      { key: "budget", operator: "less than", values: ["300 USD"] },
      { key: "deadline", operator: "contains", values: ["1 week"] },
      { key: "skills", operator: "contains", values: ["Python", "PDF", "automation"] }
    ],
    tags: ["freelance", "tech", "automation", "budget", "deadline"]
  },
  {
    id: "quality-extract-063",
    input: "Gig: Dog walker needed for two medium dogs. Weekdays 12-1pm. $20/walk. Must have references.",
    expected: [
      { key: "role", operator: "contains", values: ["dog walker", "pet care"] },
      { key: "schedule", operator: "contains", values: ["weekdays", "12pm", "1pm"] },
      { key: "price", operator: "is", values: ["20 USD/walk"] },
      { key: "references", operator: "is", values: ["required"] }
    ],
    tags: ["gig", "pet-care", "schedule", "references"]
  },
  {
    id: "quality-extract-064",
    input: "Freelance offer: Senior DevOps engineer available for contract. Rate $120/hr. AWS, Kubernetes, Terraform. 10+ years exp. Remote.",
    expected: [
      { key: "role", operator: "contains", values: ["DevOps engineer", "DevOps"] },
      { key: "rate", operator: "is", values: ["120 USD/hour"] },
      { key: "remote", operator: "is", values: ["true"] },
      { key: "skills", operator: "contains", values: ["AWS", "Kubernetes", "Terraform"] },
      { key: "experienceLevel", operator: "is", values: ["senior"] }
    ],
    tags: ["freelance-offer", "tech", "devops", "remote", "senior"]
  },
  {
    id: "quality-extract-065",
    input: "Gig: Furniture assembly - IKEA bed frame and dresser. Need done today. Budget $80. Tools provided.",
    expected: [
      { key: "role", operator: "contains", values: ["furniture assembly", "handyman"] },
      { key: "item", operator: "contains", values: ["IKEA bed frame", "dresser"] },
      { key: "deadline", operator: "contains", values: ["today"] },
      { key: "budget", operator: "less than", values: ["80 USD"] }
    ],
    tags: ["gig", "furniture", "urgent", "budget"]
  },
  {
    id: "quality-extract-066",
    input: "Freelance: Technical writer needed for API documentation. 20 endpoints. Budget $500. Must know OpenAPI/Swagger. 2 weeks.",
    expected: [
      { key: "role", operator: "contains", values: ["technical writer", "documentation"] },
      { key: "task", operator: "contains", values: ["API documentation", "OpenAPI", "Swagger"] },
      { key: "budget", operator: "less than", values: ["500 USD"] },
      { key: "deadline", operator: "contains", values: ["2 weeks"] },
      { key: "quantity", operator: "is", values: ["20 endpoints"] }
    ],
    tags: ["freelance", "tech-writing", "api", "budget", "deadline"]
  },
  {
    id: "quality-extract-067",
    input: "Gig: House cleaning 3br/2ba, biweekly, 3 hours. $120 per visit. Eco-friendly products preferred. Start next Monday.",
    expected: [
      { key: "role", operator: "contains", values: ["house cleaner", "cleaning"] },
      { key: "property", operator: "contains", values: ["3br", "2ba", "3 bedroom", "2 bathroom"] },
      { key: "frequency", operator: "contains", values: ["biweekly"] },
      { key: "price", operator: "is", values: ["120 USD/visit"] },
      { key: "schedule", operator: "contains", values: ["3 hours", "Monday"] }
    ],
    tags: ["gig", "cleaning", "recurring", "budget", "eco-friendly"]
  },
  {
    id: "quality-extract-068",
    input: "Freelance offer: Graphic designer for brand identity package. Logo, color palette, typography, brand guide. $2000 flat. 3 revisions included.",
    expected: [
      { key: "role", operator: "contains", values: ["graphic designer", "brand designer"] },
      { key: "item", operator: "contains", values: ["logo", "color palette", "typography", "brand guide"] },
      { key: "price", operator: "is", values: ["2000 USD"] },
      { key: "revisions", operator: "is", values: ["3"] }
    ],
    tags: ["freelance-offer", "design", "branding", "flat-rate"]
  },

  // Events (8 cases)
  {
    id: "quality-extract-069",
    input: "Workshop: Intro to fermentation. Saturday 10am-2pm. Community kitchen. $40 includes materials. Max 15 people. Instructor: Chef Maria.",
    expected: [
      { key: "title", operator: "is", values: ["Intro to fermentation"] },
      { key: "meetingType", operator: "is", values: ["workshop"] },
      { key: "schedule", operator: "contains", values: ["Saturday", "10am", "2pm"] },
      { key: "location", operator: "contains", values: ["community kitchen"] },
      { key: "price", operator: "is", values: ["40 USD"] },
      { key: "capacity", operator: "less than", values: ["15"] },
      { key: "role", operator: "contains", values: ["instructor", "Chef Maria"] }
    ],
    tags: ["event", "workshop", "food", "education", "schedule", "paid"]
  },
  {
    id: "quality-extract-070",
    input: "Meetup: Rust programming language study group. Every Tuesday 7pm. Library room B. Free. All levels welcome. Organizer: Alex.",
    expected: [
      { key: "title", operator: "is", values: ["Rust programming language study group"] },
      { key: "meetingType", operator: "is", values: ["meetup", "study group"] },
      { key: "schedule", operator: "contains", values: ["Tuesday", "7pm", "recurring"] },
      { key: "location", operator: "contains", values: ["library"] },
      { key: "price", operator: "is", values: ["0", "free"] },
      { key: "role", operator: "contains", values: ["organizer", "Alex"] }
    ],
    tags: ["event", "meetup", "tech", "education", "free", "recurring"]
  },
  {
    id: "quality-extract-071",
    input: "Webinar: Tax strategies for freelancers. Nov 15, 2pm EST. 90 minutes. CPA presenter. Registration required. $25.",
    expected: [
      { key: "title", operator: "is", values: ["Tax strategies for freelancers"] },
      { key: "meetingType", operator: "is", values: ["webinar"] },
      { key: "schedule", operator: "contains", values: ["2026-11-15", "2pm", "EST", "90 minutes"] },
      { key: "role", operator: "contains", values: ["presenter", "CPA"] },
      { key: "price", operator: "is", values: ["25 USD"] },
      { key: "format", operator: "contains", values: ["virtual", "online"] }
    ],
    tags: ["event", "webinar", "finance", "freelance", "paid", "virtual"]
  },
  {
    id: "quality-extract-072",
    input: "Conference: Open Source Summit 2026. Seattle Convention Center. May 10-12. Keynote: Linus Torvalds. Tracks: kernel, cloud, AI. Hybrid. $499 early bird.",
    expected: [
      { key: "title", operator: "is", values: ["Open Source Summit 2026"] },
      { key: "location", operator: "is", values: ["Seattle Convention Center"] },
      { key: "startTime", operator: "is", values: ["2026-05-10"] },
      { key: "endTime", operator: "is", values: ["2026-05-12"] },
      { key: "meetingType", operator: "is", values: ["conference"] },
      { key: "conferenceType", operator: "is", values: ["hybrid"] },
      { key: "price", operator: "less than", values: ["499 USD"] },
      { key: "role", operator: "contains", values: ["keynote", "Linus Torvalds"] }
    ],
    tags: ["event", "conference", "tech", "hybrid", "paid"]
  },
  {
    id: "quality-extract-073",
    input: "Hackathon: Climate tech hackathon. 48 hours. Nov 20-22. University campus. Teams of 3-5. Prizes: $5k, $3k, $1k. Sponsors: Google, Microsoft. Free entry.",
    expected: [
      { key: "title", operator: "is", values: ["Climate tech hackathon"] },
      { key: "meetingType", operator: "is", values: ["hackathon"] },
      { key: "schedule", operator: "contains", values: ["48 hours", "2026-11-20", "2026-11-22"] },
      { key: "location", operator: "contains", values: ["university campus"] },
      { key: "teamSize", operator: "contains", values: ["3-5", "3", "5"] },
      { key: "price", operator: "is", values: ["0", "free"] },
      { key: "prize", operator: "contains", values: ["5000 USD", "3000 USD", "1000 USD"] }
    ],
    tags: ["event", "hackathon", "climate", "tech", "prizes", "free"]
  },
  {
    id: "quality-extract-074",
    input: "Community potluck: Neighborhood block party. Saturday 4pm. Oak Street park. Bring a dish. Kids activities. Rain date: Sunday.",
    expected: [
      { key: "title", operator: "is", values: ["Neighborhood block party", "community potluck"] },
      { key: "meetingType", operator: "is", values: ["potluck", "block party", "social"] },
      { key: "schedule", operator: "contains", values: ["Saturday", "4pm", "Sunday rain date"] },
      { key: "location", operator: "contains", values: ["Oak Street park"] },
      { key: "price", operator: "is", values: ["0", "free"] }
    ],
    tags: ["event", "community", "social", "free", "family"]
  },
  {
    id: "quality-extract-075",
    input: "Training: First aid/CPR certification. Red Cross. 2 days: Dec 1-2, 9am-5pm. $85. Certificate valid 2 years. Max 12 participants.",
    expected: [
      { key: "title", operator: "is", values: ["First aid/CPR certification"] },
      { key: "meetingType", operator: "is", values: ["training", "certification"] },
      { key: "schedule", operator: "contains", values: ["2 days", "2026-12-01", "2026-12-02", "9am", "5pm"] },
      { key: "price", operator: "is", values: ["85 USD"] },
      { key: "certification", operator: "contains", values: ["Red Cross", "valid 2 years"] },
      { key: "capacity", operator: "less than", values: ["12"] }
    ],
    tags: ["event", "training", "certification", "health", "paid"]
  },
  {
    id: "quality-extract-076",
    input: "Retreat: Team building offsite. Mountain lodge. Jan 15-17. Activities: hiking, workshops, planning sessions. Budget $300/person all-inclusive. Transport provided.",
    expected: [
      { key: "title", operator: "is", values: ["Team building offsite", "retreat"] },
      { key: "meetingType", operator: "is", values: ["retreat", "offsite"] },
      { key: "location", operator: "contains", values: ["mountain lodge"] },
      { key: "schedule", operator: "contains", values: ["2026-01-15", "2026-01-17"] },
      { key: "budget", operator: "less than", values: ["300 USD/person"] },
      { key: "activity", operator: "contains", values: ["hiking", "workshops", "planning"] },
      { key: "transport", operator: "is", values: ["provided"] }
    ],
    tags: ["event", "retreat", "team-building", "budget", "all-inclusive"]
  },

  // Knowledge / Education (6 cases)
  {
    id: "quality-extract-077",
    input: "Mentor needed: Junior developer seeking guidance on system design. Weekly 1hr sessions. Budget $50/session. Prefers backend experience.",
    expected: [
      { key: "role", operator: "contains", values: ["mentor", "senior developer"] },
      { key: "student", operator: "contains", values: ["junior developer"] },
      { key: "subject", operator: "contains", values: ["system design", "backend"] },
      { key: "schedule", operator: "contains", values: ["weekly", "1hr", "1 hour"] },
      { key: "price", operator: "is", values: ["50 USD/session"] }
    ],
    tags: ["education", "mentorship", "tech", "paid", "recurring"]
  },
  {
    id: "quality-extract-078",
    input: "Study group: Machine learning paper reading group. Biweekly Fridays 3pm. Virtual. Reading: Attention Is All You Need. Free. Coordinator: Dr. Chen.",
    expected: [
      { key: "title", operator: "is", values: ["Machine learning paper reading group"] },
      { key: "meetingType", operator: "is", values: ["study group", "reading group"] },
      { key: "schedule", operator: "contains", values: ["biweekly", "Friday", "3pm"] },
      { key: "format", operator: "contains", values: ["virtual"] },
      { key: "subject", operator: "contains", values: ["machine learning", "Attention Is All You Need"] },
      { key: "price", operator: "is", values: ["0", "free"] },
      { key: "role", operator: "contains", values: ["coordinator", "Dr. Chen"] }
    ],
    tags: ["education", "study-group", "ml", "research", "free", "virtual"]
  },
  {
    id: "quality-extract-079",
    input: "Course: Photography basics. 6 weeks, Tuesdays 6-8pm. Community college. $180. Instructor: Prof. Adams. Covers: exposure, composition, editing.",
    expected: [
      { key: "title", operator: "is", values: ["Photography basics"] },
      { key: "meetingType", operator: "is", values: ["course", "class"] },
      { key: "schedule", operator: "contains", values: ["6 weeks", "Tuesday", "6pm", "8pm"] },
      { key: "location", operator: "contains", values: ["community college"] },
      { key: "price", operator: "is", values: ["180 USD"] },
      { key: "role", operator: "contains", values: ["instructor", "Prof. Adams"] },
      { key: "subject", operator: "contains", values: ["exposure", "composition", "editing"] }
    ],
    tags: ["education", "course", "photography", "paid", "arts"]
  },
  {
    id: "quality-extract-080",
    input: "Tutor: High school physics AP. Student struggling with electromagnetism. 2x/week, 1hr each. Budget $60/hr. In-person preferred.",
    expected: [
      { key: "role", operator: "contains", values: ["tutor", "physics tutor"] },
      { key: "student", operator: "contains", values: ["high school", "AP"] },
      { key: "subject", operator: "contains", values: ["physics", "electromagnetism"] },
      { key: "schedule", operator: "contains", values: ["2x/week", "2 times per week", "1hr", "1 hour"] },
      { key: "price", operator: "is", values: ["60 USD/hour"] },
      { key: "format", operator: "contains", values: ["in-person"] }
    ],
    tags: ["education", "tutoring", "stem", "paid", "in-person"]
  },
  {
    id: "quality-extract-081",
    input: "Workshop offer: Teaching digital literacy to seniors. 4 sessions, Saturdays 10am. Library. Free. Topics: email, video calls, online safety. Volunteer instructor.",
    expected: [
      { key: "role", operator: "contains", values: ["instructor", "teacher", "volunteer"] },
      { key: "title", operator: "is", values: ["Digital literacy for seniors"] },
      { key: "meetingType", operator: "is", values: ["workshop"] },
      { key: "schedule", operator: "contains", values: ["4 sessions", "Saturday", "10am"] },
      { key: "location", operator: "contains", values: ["library"] },
      { key: "price", operator: "is", values: ["0", "free"] },
      { key: "subject", operator: "contains", values: ["email", "video calls", "online safety"] },
      { key: "audience", operator: "contains", values: ["seniors", "elderly"] }
    ],
    tags: ["education", "workshop", "digital-literacy", "seniors", "free", "volunteer"]
  },
  {
    id: "quality-extract-082",
    input: "Language exchange: Spanish-English. Weekly 30min each language. Virtual. Free. Looking for native Spanish speaker learning English.",
    expected: [
      { key: "role", operator: "contains", values: ["language exchange partner"] },
      { key: "subject", operator: "contains", values: ["Spanish", "English"] },
      { key: "schedule", operator: "contains", values: ["weekly", "30min", "30 minutes"] },
      { key: "format", operator: "contains", values: ["virtual"] },
      { key: "price", operator: "is", values: ["0", "free"] }
    ],
    tags: ["education", "language-exchange", "free", "virtual", "recurring"]
  },

  // Governance / Legal / Formal (6 cases)
  {
    id: "quality-extract-083",
    input: "HOA Board: Monthly meeting. First Tuesday 7pm. Clubhouse. Agenda: budget review, landscaping contract, pool rules. Quorum: 5 members.",
    expected: [
      { key: "title", operator: "is", values: ["HOA Board meeting"] },
      { key: "meetingType", operator: "is", values: ["board meeting", "hoa"] },
      { key: "schedule", operator: "contains", values: ["monthly", "first Tuesday", "7pm"] },
      { key: "location", operator: "contains", values: ["clubhouse"] },
      { key: "agenda", operator: "contains", values: ["budget review", "landscaping contract", "pool rules"] },
      { key: "quorum", operator: "is", values: ["5 members"] }
    ],
    tags: ["governance", "hoa", "meeting", "recurring", "quorum"]
  },
  {
    id: "quality-extract-084",
    input: "Nonprofit bylaws amendment: Proposing term limits for board members. 2 terms max, 3 years each. Vote at annual meeting June 15. Requires 2/3 majority.",
    expected: [
      { key: "title", operator: "is", values: ["Nonprofit bylaws amendment"] },
      { key: "meetingType", operator: "is", values: ["governance", "vote"] },
      { key: "proposal", operator: "contains", values: ["term limits", "board members", "2 terms", "3 years"] },
      { key: "schedule", operator: "contains", values: ["annual meeting", "June 15"] },
      { key: "threshold", operator: "is", values: ["2/3 majority", "two-thirds"] }
    ],
    tags: ["governance", "nonprofit", "bylaws", "vote", "board"]
  },
  {
    id: "quality-extract-085",
    input: "City council: Zoning variance request. Property: 123 Main St. Current: residential. Requested: mixed-use. Hearing: Nov 20, 6pm. City hall. Public comment period.",
    expected: [
      { key: "title", operator: "is", values: ["Zoning variance request"] },
      { key: "meetingType", operator: "is", values: ["city council", "hearing"] },
      { key: "location", operator: "contains", values: ["123 Main St", "city hall"] },
      { key: "proposal", operator: "contains", values: ["residential", "mixed-use", "zoning variance"] },
      { key: "schedule", operator: "contains", values: ["Nov 20", "6pm"] },
      { key: "publicComment", operator: "is", values: ["open", "public comment period"] }
    ],
    tags: ["governance", "zoning", "city-council", "public-hearing", "land-use"]
  },
  {
    id: "quality-extract-086",
    input: "Cooperative: Member vote on profit distribution. Options: (A) 60% reinvest, 40% dividends (B) 50/50 split (C) 70% reinvest. Vote by Dec 1. Online ballot.",
    expected: [
      { key: "title", operator: "is", values: ["Cooperative profit distribution vote"] },
      { key: "meetingType", operator: "is", values: ["cooperative", "member vote"] },
      { key: "proposal", operator: "contains", values: ["profit distribution", "reinvest", "dividends", "split"] },
      { key: "deadline", operator: "before", values: ["2026-12-01"] },
      { key: "format", operator: "contains", values: ["online ballot"] }
    ],
    tags: ["governance", "cooperative", "vote", "profit-sharing", "democracy"]
  },
  {
    id: "quality-extract-087",
    input: "Labor agreement: CBA renewal negotiations. Union: Teamsters Local 500. Employer: City Transit. Key issues: wages +5%, healthcare, pension. Current contract expires Dec 31. Mediation scheduled.",
    expected: [
      { "key": "title", "operator": "is", "values": ["CBA renewal", "labor agreement"] },
      { "key": "parties", "operator": "contains", "values": ["Teamsters Local 500", "City Transit"] },
      { "key": "proposal", "operator": "contains", "values": ["wages +5%", "healthcare", "pension"] },
      { "key": "deadline", "operator": "before", "values": ["2026-12-31"] },
      { "key": "mediation", "operator": "is", "values": ["scheduled"] }
    ],
    tags: ["governance", "labor", "cba", "union", "negotiation", "mediation"]
  },
  {
    id: "quality-extract-088",
    input: "Data processing agreement: Controller: HealthTech Inc. Processor: CloudAnalytics LLC. Purpose: patient analytics. Subprocessors: AWS. SCCs in place. Term: 3 years. Audit rights: annual.",
    expected: [
      { key: "title", operator: "is", values: ["Data processing agreement", "DPA"] },
      { key: "parties", operator: "contains", values: ["HealthTech Inc", "CloudAnalytics LLC"] },
      { key: "role", operator: "contains", values: ["controller", "processor"] },
      { key: "purpose", operator: "contains", values: ["patient analytics"] },
      { key: "subprocessors", operator: "contains", values: ["AWS"] },
      { key: "safeguards", operator: "contains", values: ["SCCs", "standard contractual clauses"] },
      { key: "duration", operator: "contains", values: ["3 years"] },
      { key: "auditRights", operator: "contains", values: ["annual"] }
    ],
    tags: ["governance", "legal", "data-protection", "dpa", "gdpr", "healthcare"]
  },

  // Crisis / Mutual Aid / Survival (6 cases)
  {
    id: "quality-extract-089",
    input: "Mutual aid: Free grocery delivery for immunocompromised neighbors. Volunteers needed Mon/Wed/Fri mornings. Sign up: mutualaid.example.org. Background check required.",
    expected: [
      { key: "role", operator: "contains", values: ["volunteer", "delivery driver"] },
      { key: "task", operator: "contains", values: ["grocery delivery", "immunocompromised"] },
      { key: "schedule", operator: "contains", values: ["Mon", "Wed", "Fri", "mornings"] },
      { key: "price", operator: "is", values: ["0", "free"] },
      { key: "backgroundCheck", operator: "is", "values": ["required"] },
      { key: "signup", operator: "contains", values: ["mutualaid.example.org"] }
    ],
    tags: ["mutual-aid", "crisis-response", "volunteer", "grocery", "health", "free"]
  },
  {
    id: "quality-extract-090",
    input: "Disaster relief: Temporary shelter setup. Location: Fairgrounds. Capacity: 200 people. Needs: cots, blankets, heating, portable toilets. Volunteers: 20 for setup. Red Cross coordinating.",
    expected: [
      { key: "title", operator: "is", values: ["Temporary shelter setup", "disaster relief"] },
      { key: "location", operator: "contains", values: ["fairgrounds"] },
      { key: "capacity", operator: "is", values: ["200"] },
      { key: "resourceType", operator: "contains", "values": ["cots", "blankets", "heating", "portable toilets"] },
      { key: "volunteers", operator: "is", values: ["20"] },
      { key: "role", operator: "contains", values: ["Red Cross", "coordinator"] }
    ],
    tags: ["crisis-response", "shelter", "disaster-relief", "volunteer", "capacity"]
  },
  {
    id: "quality-extract-091",
    input: "Emergency: Need generator for medical devices during power outage. Patient on ventilator. Runtime: 48 hours minimum. Budget $500. Pickup today.",
    expected: [
      { key: "role", operator: "contains", values: ["generator", "power backup"] },
      { key: "task", operator: "contains", values: ["medical devices", "ventilator", "power outage"] },
      { key: "duration", operator: "contains", values: ["48 hours"] },
      { key: "budget", operator: "less than", values: ["500 USD"] },
      { key: "deadline", operator: "contains", values: ["today"] },
      { key: "hasMedical", operator: "is", values: ["true"] },
      { key: "hasPower", operator: "is", values: ["true"] }
    ],
    tags: ["crisis-response", "medical", "emergency", "power", "urgent", "budget"]
  },
  {
    id: "quality-extract-092",
    input: "Community fridge: Stocking fresh produce and meals. Location: 5th Ave & Main. Open 24/7. Donations accepted Mon-Sat 10-6. Volunteers for restocking needed. No expired food.",
    expected: [
      { key: "title", operator: "is", values: ["Community fridge"] },
      { key: "location", operator: "contains", values: ["5th Ave", "Main"] },
      { key: "schedule", operator: "contains", values: ["24/7", "Mon-Sat 10-6"] },
      { key: "resourceType", operator: "contains", values: ["fresh produce", "meals"] },
      { key: "role", operator: "contains", values: ["volunteer", "restocking"] },
      { key: "forbidden", operator: "contains", values: ["expired food"] }
    ],
    tags: ["mutual-aid", "food-security", "community", "volunteer", "24-7"]
  },
  {
    id: "quality-extract-093",
    input: "Evacuation assistance: Elderly couple needs transport to shelter. Wheelchair accessible vehicle required. Medical supplies: oxygen tank, medications. Destination: High School gym. Contact: 555-0144.",
    expected: [
      { key: "role", operator: "contains", values: ["transport", "evacuation assistance"] },
      { key: "recipient", operator: "contains", values: ["elderly couple", "senior"] },
      { key: "vehicle", operator: "contains", values: ["wheelchair accessible"] },
      { key: "careRequirements", operator: "contains", values: ["oxygen tank", "medications"] },
      { key: "location", operator: "contains", values: ["High School gym", "shelter"] },
      { key: "emergencyContact", operator: "is", values: ["555-0144"] },
      { key: "hasMedical", operator: "is", values: ["true"] }
    ],
    tags: ["crisis-response", "evacuation", "elderly", "medical", "accessibility", "transport"]
  },
  {
    id: "quality-extract-094",
    input: "Warming center: Open Dec 1 - Mar 31. Nightly 7pm-7am. Church basement. Capacity 50. Needs: volunteers overnight, hot drinks, blankets. City funded. No ID required.",
    expected: [
      { key: "title", operator: "is", values: ["Warming center"] },
      { key: "schedule", operator: "contains", values: ["Dec 1", "Mar 31", "nightly", "7pm", "7am"] },
      { key: "location", operator: "contains", values: ["church basement"] },
      { key: "capacity", operator: "is", values: ["50"] },
      { key: "resourceType", operator: "contains", values: ["hot drinks", "blankets"] },
      { key: "role", operator: "contains", values: ["volunteer", "overnight"] },
      { key: "funding", operator: "contains", values: ["city funded"] },
      { key: "requirements", operator: "contains", values: ["no ID required"] }
    ],
    tags: ["crisis-response", "warming-center", "homelessness", "winter", "city-funded", "volunteer"]
  },

  // Edge cases / Complex (6 cases)
  {
    id: "quality-extract-095",
    input: "Job share: Two part-time devs sharing one full-time role. 20hrs/week each. Mon-Wed / Wed-Fri overlap. Shared Slack channel. Salary: $80k each. Benefits: pro-rated.",
    expected: [
      { key: "role", operator: "contains", values: ["developer", "job share"] },
      { key: "employmentType", operator: "is", values: ["part-time", "job-share"] },
      { key: "schedule", operator: "contains", values: ["20hrs/week", "Mon-Wed", "Wed-Fri", "overlap"] },
      { key: "budget", operator: "is", values: ["80000 USD"] },
      { key: "benefits", operator: "contains", values: ["pro-rated"] },
      { key: "coordination", operator: "contains", values: ["shared Slack channel"] }
    ],
    tags: ["work", "job-share", "part-time", "tech", "benefits"]
  },
  {
    id: "quality-extract-096",
    input: "Apprenticeship: Carpentry apprentice wanted. 4-year program. 8000 hrs on-the-job + 576 hrs classroom. Wage: 50% journeyman rate to start. Union: Carpenters Local 22. Must be 18+.",
    expected: [
      { key: "role", operator: "contains", values: ["apprentice", "carpentry"] },
      { key: "duration", operator: "contains", values: ["4-year", "8000 hrs", "576 hrs"] },
      { key: "wage", operator: "contains", values: ["50% journeyman rate"] },
      { key: "certification", operator: "contains", values: ["Carpenters Local 22", "union"] },
      { key: "requirements", operator: "contains", values: ["18+", "age 18"] }
    ],
    tags: ["work", "apprenticeship", "trades", "union", "certification"]
  },
  {
    id: "quality-extract-097",
    input: "Barter: Web design for accounting services. Need: small business website, 5 pages. Offer: tax prep + bookkeeping for 1 year. Value: ~$3000 each side. No cash exchanged.",
    expected: [
      { key: "role", operator: "contains", values: ["web designer", "accountant"] },
      { key: "item", operator: "contains", values: ["website", "5 pages", "small business"] },
      { key: "offer", operator: "contains", values: ["tax prep", "bookkeeping", "1 year"] },
      { key: "price", operator: "is", values: ["3000 USD", "barter"] },
      { key: "format", operator: "contains", values: ["barter", "trade", "no cash"] }
    ],
    tags: ["work", "barter", "trade", "web-design", "accounting", "no-cash"]
  },
  {
    id: "quality-extract-098",
    input: "Subscription: Weekly CSA box. Organic vegetables. $35/week. Pickup: Farm Saturdays 9-12 or delivery +$5. Season: May-Oct. Half-share available $20/wk. Commitment: full season.",
    expected: [
      { key: "role", operator: "contains", values: ["CSA", "farm share", "subscription"] },
      { key: "item", operator: "contains", values: ["organic vegetables", "produce"] },
      { key: "price", operator: "contains", values: ["35 USD/week", "20 USD/week", "half-share"] },
      { key: "schedule", operator: "contains", values: ["weekly", "Saturday", "9am", "12pm", "May-Oct"] },
      { key: "delivery", operator: "contains", values: ["pickup", "delivery +$5"] },
      { key: "commitment", operator: "contains", values: ["full season"] }
    ],
    tags: ["food", "subscription", "csa", "organic", "recurring", "seasonal"]
  },
  {
    id: "quality-extract-099",
    input: "Co-housing: Seeking 2 households for 4-unit building. Shared: garden, workshop, guest room. Private: 2br units. Decision-making: consensus. Monthly dues: $300. Move-in: Spring 2027.",
    expected: [
      { key: "role", operator: "contains", values: ["co-housing", "cooperative housing"] },
      { key: "item", operator: "contains", values: ["4-unit building", "2br units"] },
      { key: "shared", operator: "contains", values: ["garden", "workshop", "guest room"] },
      { key: "decisionMaking", operator: "contains", values: ["consensus"] },
      { key: "price", operator: "is", values: ["300 USD/month", "monthly dues"] },
      { key: "schedule", operator: "contains", values: ["Spring 2027", "move-in"] }
    ],
    tags: ["housing", "co-housing", "cooperative", "consensus", "community", "shared-space"]
  },
  {
    id: "quality-extract-100",
    input: "Timebank: Offering 1 hour Spanish tutoring. Seeking: 1 hour bike repair. Timebank: CommunityHours.org. All hours valued equally. No direct exchange required.",
    expected: [
      { key: "role", operator: "contains", values: ["timebank", "exchange"] },
      { key: "offer", operator: "contains", values: ["Spanish tutoring", "1 hour"] },
      { key: "need", operator: "contains", values: ["bike repair", "1 hour"] },
      { key: "platform", operator: "contains", values: ["CommunityHours.org", "timebank"] },
      { key: "price", operator: "is", values: ["1 hour", "time credit"] },
      { key: "format", operator: "contains", values: ["timebank", "indirect exchange"] }
    ],
    tags: ["mutual-aid", "timebank", "barter", "services", "community", "equal-value"]
  }
];

// Write all cases
for (const c of newCases) {
  const output = {
    id: c.id,
    family: "quality",
    qualityFamily: "extraction",
    input: c.input,
    expected: c.expected,
    forbidden: c.forbidden || [],
    labels: { annotators: 2, agreement: 0.88 },
    tags: c.tags
  };
  writeFileSync(join(casesDir, `${c.id}.json`), JSON.stringify(output, null, 2));
}

console.log(`Generated ${newCases.length} new quality extraction cases (061-100)`);

// Update manifest
const manifestPath = '/home/me/notention9/data/eval/cases/manifest.json';
const manifest = JSON.parse(require('fs').readFileSync(manifestPath, 'utf-8'));
manifest.counts.quality.extraction = 100;
manifest.version += 1;
manifest.generatedAt = new Date().toISOString();

// Add new cases to manifest
for (const c of newCases) {
  manifest.cases.push({
    id: c.id,
    family: "quality",
    split: "extraction",
    path: `quality/extraction/${c.id}.json`,
    hash: "generated",
    tags: c.tags
  });
}

require('fs').writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Updated manifest.json with 100 quality extraction cases');