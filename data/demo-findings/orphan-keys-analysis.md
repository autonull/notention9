# Orphan Keys Analysis — Ontology Coverage Gap

**Date:** 2026-11-13  
**Source:** E7 Ontology Audit (137 orphan keys, 145 total ontology keys, 23 covered in quality cases)

---

## Summary

| Metric | Count |
|--------|-------|
| Total ontology keys | 145 |
| Keys covered in quality extraction cases | 23 |
| **Orphan keys (no quality coverage)** | **137** |
| Keys with operator drift (covered but mismatched) | 8 |

---

## Categorization of Orphan Keys

### Category 1: Core Domains — Should Add Quality Coverage (Priority: High)

These keys belong to domains that are fundamental to the coordination paradigm and should have extraction test coverage.

#### Communication Domain (12 keys)
| Key | Domain | Node | Reason for Coverage |
|-----|--------|------|---------------------|
| `bcc` | communication | message | Email-style coordination primitive |
| `cc` | communication | message | Email-style coordination primitive |
| `body` | communication | message | Core message content |
| `subject` | communication | message | **Already in quality cases (frequency: 2)** — *Wait, this is NOT orphan* |
| `from` | communication | message | Sender identity |
| `to` | communication | message | Recipient identity |
| `conversationId` | communication | thread | Thread linking |
| `messageType` | communication | message | Message classification |

**Correction:** `subject` appears in quality cases (2 occurrences). The orphan list may be stale or `subject` is defined in multiple nodes.

#### Event/Meeting Domain (15 keys)
| Key | Domain | Node | Reason for Coverage |
|-----|--------|------|---------------------|
| `agenda` | event | meeting | Meeting coordination |
| `actionItems` | event | meeting | Outcome tracking |
| `attendees` | event | meeting | Participant list |
| `meetingType` | event | meeting | Classification |
| `organizer` | event | meeting | Ownership |
| `venue` | event | meeting | Location detail |
| `startDateTime` | event | meeting | Scheduling |
| `endDateTime` | event | meeting | Scheduling |
| `conferenceType` | event | conference | Specialized meeting |
| `keynoteSpeakers` | event | conference | Participant detail |

#### Work/Job Domain (18 keys)
| Key | Domain | Node | Reason for Coverage |
|-----|--------|------|---------------------|
| `title` | work | job-request | Job identification |
| `company` | work | job-request | Employer |
| `employmentType` | work | job-request | Work arrangement |
| `experienceLevel` | work | job-request | Seniority |
| `skills` | work | job-request | **Already in quality cases? No — only `role` and `budget`** |
| `rate` | work | freelance-offer | Pricing |
| `remote` | work | job-request | Location flexibility |
| `assignee` | work | task | Task ownership |
| `priority` | work | task | Urgency |
| `status` | work | task | Progress |
| `dueDate` | work | task | Deadline |
| `estimatedHours` | work | task | Effort estimation |
| `actualHours` | work | task | Effort tracking |
| `teamSize` | work | project | Scale |
| `projectId` | work | project | Grouping |

#### Survival/Commons Domains (22 keys) — **New Taxonomy Scenarios**
These keys were added for the 4 new taxonomy scenarios (legal-contract, crisis-response, generational-stewardship, kinship-care) and survival domains.

| Key | Domain | Node | Scenario |
|-----|--------|------|----------|
| `careRequirements` | survival | care-request | kinship-care, crisis-response |
| `hasMedical` | survival | shelter-offer | family-evacuation, crisis-response |
| `hasPower` | survival | shelter-offer | family-evacuation, crisis-response |
| `hasWater` | survival | shelter-offer | family-evacuation, crisis-response |
| `hasSanitation` | survival | shelter-offer | family-evacuation |
| `hasComms` | survival | shelter-offer | crisis-response, mesh-relay-failover |
| `shelterType` | survival | shelter-offer | family-evacuation |
| `capacity` | survival | shelter-offer | resource-distribution |
| `currentOccupancy` | survival | shelter-offer | resource-distribution |
| `resourceType` | survival | supply-offer | resource-distribution |
| `quantity` | survival | supply-offer | resource-distribution |
| `supplies` | survival | manifest | family-evacuation |
| `suppliesNeeded` | survival | manifest | family-evacuation |
| `medications` | survival | manifest | family-evacuation, kinship-care |
| `emergencyContact` | survival | manifest | crisis-response |
| `severity` | survival | incident | crisis-response |
| `hazardType` | survival | incident | crisis-response |
| `hazards` | survival | incident | crisis-response |
| `protectionLevel` | survival | protection | crisis-response |
| `protectionType` | survival | protection | crisis-response |
| `protectionUsed` | survival | protection | crisis-response |

#### Legal/Contract Domain (8 keys) — **New: legal-contract scenario**
| Key | Domain | Node | Scenario |
|-----|--------|------|----------|
| `contractType` | legal | contract | legal-contract |
| `jurisdiction` | legal | contract | legal-contract |
| `parties` | legal | contract | legal-contract |
| `terms` | legal | contract | legal-contract |
| `effectiveDate` | legal | contract | legal-contract |
| `expirationDate` | legal | contract | legal-contract |
| `governingLaw` | legal | contract | legal-contract |
| `signatures` | legal | contract | legal-contract |

#### Generational/Kinship Domain (10 keys) — **New: generational-stewardship, kinship-care**
| Key | Domain | Node | Scenario |
|-----|--------|------|----------|
| `steward` | generational | plot | generational-stewardship |
| `gardenBed` | generational | plot | generational-stewardship |
| `harvestShare` | generational | plot | generational-stewardship |
| `lineage` | kinship | family | kinship-care |
| `guardian` | kinship | care-arrangement | kinship-care |
| `ward` | kinship | care-arrangement | kinship-care |
| `careSchedule` | kinship | care-arrangement | kinship-care |
| `visitationRights` | kinship | care-arrangement | kinship-care |
| `medicalAuthority` | kinship | care-arrangement | kinship-care |
| `financialResponsibility` | kinship | care-arrangement | kinship-care |

---

### Category 2: Extended/Optional Attributes — Document as Intentional (Priority: Low)

These keys exist in the ontology for completeness and future extensibility but are not core to current coordination scenarios. They should be documented as intentional gaps.

#### Communication Extended (8 keys)
| Key | Reason |
|-----|--------|
| `attachments` | File attachments — handled by separate blob storage |
| `timestamp` | Auto-generated, not user-extracted |
| `channel` | Transport layer (nostr/relay), not content |
| `encryption` | Protocol-level, not semantic |
| `relays` | Network topology, not note content |
| `networkType` | Network topology, not note content |
| `conversationId` | Thread linking — may be derived |
| `messageType` | Protocol-level classification |

#### Event Extended (6 keys)
| Key | Reason |
|-----|--------|
| `registrationUrl` | External reference, not semantic content |
| `tracks` | Conference-specific, niche |
| `conferenceType` | Covered by `meetingType` + tags |
| `keynoteSpeakers` | Nested data, better as separate notes |
| `equipment` | Venue detail, niche |
| `amenities` | Venue detail, niche |

#### Work Extended (10 keys)
| Key | Reason |
|-----|--------|
| `benefits` | HR detail, not coordination primitive |
| `visaSponsorship` | Jurisdiction-specific |
| `securityClearance` | Niche (gov/defense) |
| `travelRequired` | Derived from location + remote |
| `relocationAssistance` | HR detail |
| `equipmentProvided` | Employer detail |
| `trainingProvided` | HR detail |
| `probationPeriod` | HR detail |
| `noticePeriod` | Contract detail |
| `stockOptions` | Compensation detail |

#### Survival Extended (12 keys)
| Key | Reason |
|-----|--------|
| `batteryLife` | Device detail, not coordination |
| `fuelCapacity` | Vehicle detail |
| `fuelLevel` | Real-time telemetry |
| `fuelType` | Vehicle spec |
| `offRoad` | Vehicle capability |
| `vehicleType` | Vehicle spec |
| `vehicleTypes` | Fleet detail |
| `cargoCapacity` | Logistics detail |
| `armored` | Specialized vehicle |
| `range` | Vehicle spec |
| `powerSource` | Infrastructure detail |
| `coordinates` | Geographic precision, not semantic |

#### Person/Identity Extended (12 keys)
| Key | Reason |
|-----|--------|
| `firstName` | PII — intentional separation from semantic notes |
| `lastName` | PII — intentional separation |
| `email` | Contact info, not coordination content |
| `phone` | Contact info, not coordination content |
| `address` | Location detail, covered by `location` |
| `city` | Location detail, covered by `location` |
| `country` | Location detail, covered by `location` |
| `company` | Affiliation, covered by `role` + `organization` |
| `industry` | Classification, niche |
| `founded` | Org history, not coordination |
| `employees` | Org scale, not coordination |
| `owner` | Ownership, legal detail |

#### Miscellaneous Extended (14 keys)
| Key | Reason |
|-----|--------|
| `sku` | Retail/inventory, not coordination |
| `brand` | Product detail |
| `condition` | Item state, niche |
| `conditionType` | Niche classification |
| `warranty` | Legal/commercial |
| `purchasePrice` | Transaction history |
| `priceRate` | Redundant with `rate` |
| `cost` | Redundant with `budget`/`price` |
| `stock` | Inventory |
| `source` | Provenance, niche |
| `website` | External reference |
| `registrationUrl` | External reference |
| `access` | Permission, protocol-level |
| `labels` | Tagging system, not semantic extraction |

---

### Category 3: Possibly Redundant / Derived — Review for Consolidation (Priority: Medium)

These keys may overlap with existing covered keys or be derivable.

| Orphan Key | Potential Duplicate Of | Notes |
|------------|------------------------|-------|
| `cost` | `budget`, `price` | Same semantic field |
| `priceRate` | `rate` | Same semantic field |
| `address` | `location` | `location` already uses `contains` |
| `city` | `location` | Subsumed by location hierarchy |
| `country` | `location` | Subsumed by location hierarchy |
| `venue` | `location` | Event-specific location |
| `center` | `location` | Geographic center |
| `coordinates` | `location` | Precision variant |
| `start` | `startDateTime` | Abbreviation |
| `end` | `endDateTime` | Abbreviation |
| `duration` | `estimatedHours`, `actualHours` | Time span |
| `estimatedTime` | `estimatedHours` | Same concept |
| `deliveryTime` | `deadline` | Logistics variant |
| `registrationUrl` | `website` | External ref |
| `website` | `source` | External ref |
| `notes` | `description`, `body` | Free text |
| `description` | `body` | Overlap |
| `intent` | `role`, `need` | Covered by extraction |
| `need` | `role` (for requests) | Request semantics |

---

## Recommendations

### Immediate Actions (This Probe Cycle)

1. **Add quality extraction cases for Category 1 (Core Domains):**
   - Communication: `bcc`, `cc`, `body`, `from`, `to` (5 cases)
   - Event: `agenda`, `actionItems`, `attendees`, `organizer`, `venue`, `startDateTime`, `endDateTime` (7 cases)
   - Work: `title`, `company`, `employmentType`, `skills`, `rate`, `assignee`, `priority`, `dueDate` (8 cases)
   - **Total: ~20 new quality extraction cases**

2. **Add quality extraction cases for NEW taxonomy scenarios (Category 1 — Survival/Legal/Generational):**
   - These 40 keys are for newly added scenarios that need baseline coverage
   - Add 1-2 cases per scenario domain (legal-contract, crisis-response, generational-stewardship, kinship-care)
   - **Total: ~8-10 new quality extraction cases**

3. **Document Category 2 & 3 as intentional in this file** (this document serves as the record)

### Next Probe Cycle

1. Run audit again to verify coverage improvement
2. Address operator drift for newly covered keys
3. Consider consolidating Category 3 redundant keys

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-13 | Categorized 137 orphan keys into 3 categories | Systematic approach to addressing audit findings |
| 2026-11-13 | Category 1 (Core + New Scenarios) → add quality cases | These keys represent coordination primitives that must be extractable |
| 2026-11-13 | Category 2 (Extended/Optional) → document as intentional | Not core to current coordination scenarios; exist for extensibility |
| 2026-11-13 | Category 3 (Redundant) → review for consolidation | Reduce ontology surface area, improve extraction precision |

---

## Audit Results After Adding 12 Quality Cases (2026-11-13)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Quality extraction cases | 38 | 50 | +12 |
| Keys in cases | 23 | 72 | +49 |
| **Orphan keys** | **137** | **104** | **-33** |
| Keys with operator drift | 8 | 16 | +8 (new keys) |

### Keys Now Covered (33)
- Communication: `from`, `to`, `cc`, `bcc`, `body`, `subject` (6)
- Event: `agenda`, `actionItems`, `organizer`, `venue`, `startDateTime`, `endDateTime`, `meetingType`, `conferenceType` (8)
- Work: `title`, `company`, `employmentType`, `skills`, `rate`, `remote`, `assignee`, `priority`, `dueDate`, `estimatedHours`, `actualHours`, `status`, `task` (13)
- Survival/Crisis: `careRequirements`, `hasMedical`, `hasPower`, `capacity`, `emergencyContact`, `resourceType`, `quantity` (7)
- Legal: `contractType`, `parties`, `jurisdiction`, `governingLaw`, `effectiveDate`, `expirationDate` (6)
- Generational: `steward`, `gardenBed`, `harvestShare`, `lineage` (4)
- Kinship: `guardian`, `ward`, `careSchedule`, `medicalAuthority`, `financialResponsibility`, `visitationRights` (6)

**Total: 50 keys covered** (some overlap in categories)

### New Operator Drift (Expected — Ontology Defaults Need Update)
The 8 new keys with operator drift reflect real usage patterns that differ from ontology defaults:
- `skills`: ontology=[is] → observed=[contains]
- `agenda`: ontology=[is] → observed=[contains]
- `capacity`: ontology=[is, greater than, less than, between] → observed=[greater than]
- `emergencyContact`: ontology=[is, contains] → observed=[is]
- `resourceType`: ontology=[is] → observed=[contains]
- `quantity`: ontology=[is, greater than, less than] → observed=[greater than]
- `body`: ontology=[is] → observed=[contains]
- `dueDate`: ontology=[is] → observed=[before]

These should be addressed in the next ontology patch cycle (E14).

---

## Next Steps

1. [x] Create quality extraction test cases for Category 1 core domains (communication, event, work)
2. [x] Create quality extraction test cases for new taxonomy scenarios (survival, legal, generational, kinship)
3. [x] Re-run E7 audit to verify coverage improvement (orphan keys: 137 → 104)
4. [ ] Update TODO.23.md with progress
5. [ ] Address new operator drift in next patch cycle (E14)