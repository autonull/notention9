# Notention-MoltBot Integration Plan
## Ontology-Driven Architecture

> **Implementation Status:** Phase 1.1 Complete (Gateway Connection). See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for current progress and next steps.



### Executive Summary

**Vision:** Notention as a universal semantic interface where an evolving **ontology** drives all functionality—UI generation, semantic matching, skill execution, and data import from external "silo" systems.

**Architectural Principle:** The **ontology** is the foundation. It defines:
- What properties exist (`role`, `location`, `price`, `date`, etc.)
- Types and operators for each (`string`, `number`, `geo`, `datetime`)
- UI widgets (date picker, map, slider)
- Matching logic (fuzzy keys, context inference)
- Skill patterns (what triggers automation)

**External Systems as Adapters:** Indeed, Zillow, Craigslist are "necessary evil" web scrapers that **lift data into Notention's semantic space**. They don't drive the ontology—they adapt TO it.

**Priority:** Ontology evolution and user functionality first. Developer tools last.

---

## Phase 1: MoltBot Integration & Ontology Foundation (Week 1-2)

### 1.1 Gateway Connection
**Goal:** Connect to MoltBot for messaging

- WebSocket client → ws://127.0.0.1:18789
- Token auth with auto-reconnect
- Heartbeat monitoring
- Connection status in UI

### 1.2 Bidirectional Message Sync
**Goal:** Messages ↔ Notes using ontology properties

**Inbound (MoltBot → Notention):**
- WhatsApp message → New note
  - Extract properties using ontology-guided NLP
  - `from` → Look up in ontology (phone number type)
  - `content` → Semantic extraction based on known attribute patterns
  - `timestamp` → Datetime type
- Map to ontology attributes, not hardcoded fields

**Outbound (Notention → MoltBot):**
- Note with property matching `{type: 'string', operators: {imaginary: ['send to']}}`
- System detects "send" pattern from ontology
- Routes to appropriate MoltBot channel

**Key:** Use **ontology metadata** to determine behavior, not `if (key === 'send')`

### 1.3 Ontology-Driven Message Threading
**Goal:** Map threads using sem antic properties

- Thread ID becomes ontology property: `conversationId` (type: string)
- Group membership → Property extraction from ontology
- No hardcoded "WhatsApp" vs "Telegram" logic
- Channel adapter learns property mappings from ontology

### 1.4 Basic UI Integration
**Goal:** UI generated from ontology definitions

- **Composer:** Looks up attributes with `send`-like operators
- **Contact Selector:** Type-aware input based on `phone`/`email` attribute types
- **Thread View:** Groups notes by properties marked as "conversation" types
- All driven by ontology, zero hardcoding

---

## Phase 2: Ontology-Driven UI Generation (Week 3-4)

### 2.1 Unified Command Palette (Cmd+K)
**Goal:** Natural language → Ontology properties

**Process:**
1. User types: "send message to john"
2. NLP extracts intent: `send`, `to`, `john`
3. **Ontology query:** Find attributes matching:
   - Key contains "send" OR operator contains "send"
   - Type accepts contact identifier
4. Create property from ontology definition
5. Apply to note

**Not hardcoded.** System learns from ontology what "send" means.

### 2.2 Universal Property Extraction Engine
**Goal:** Extract properties based on ontology schema

**Instead of:**
```typescript
if (text.includes("job")) addProperty("role", "Engineer");
```

**Do:**
```typescript
// Scan ontology for all string attributes
// Match text patterns against attribute descriptions
// Extract values based on type constraints
// Validate using ontology operators
```

- **Voice Input:** Transcribe → Ontology-guided extraction
- **Template Suggestions:** Query ontology for nodes matching partial pattern
- **Property Inference:** Use ontology relationships (e.g., `deadline` implies `task` node)

### 2.3 Type-Aware Input Widgets (Auto-Generated)
**Goal:** UI components generated from ontology attribute types

**Ontology Definition:**
```typescript
{
  id: 'event',
  attributes: {
    startDateTime: { type: 'datetime', icon: 'clock', ... },
    location: { type: 'geo', icon: 'map-pin', ... },
    price: { type: 'number', operators: { imaginary: ['less than', ...] } }
  }
}
```

**Generated UI:**
- `datetime` → Date/time picker widget
- `geo` → Map picker widget
- `number` + `less than` operator → Slider with range
- `enum` → Dropdown with options from ontology

**No hardcoded forms.** Ontology = UI schema.

### 2.4 Semantic Query Builder
**Goal:** Visual query construction from ontology

- Dropdown of all attribute keys (from ontology traversal)
- Operator dropdown populated from `attribute.operators.imaginary`
- Value input type based on `attribute.type`
- Live preview using semantic matching engine
- Saved templates stored as ontology query patterns

---

## Phase 3: Ontology-Driven Skills (Week 5-6)

### 3.1 Skills as Semantic Adapters
**Goal:** External systems adapt to ontology, not vice versa

**Core Principle:** Skills don't define domains. They **map external data to ontology properties**.

**Skill Definition (Data-Driven):**
```typescript
{
  id: 'indeed-adapter',
  name: 'Indeed Job Search',

  // Pattern matching against ontology
  semanticPattern: {
    requiresAny: [
      { attributeType: 'string', keySimilarTo: ['role', 'job', 'position'] },
      { attributeType: 'string', keySimilarTo: ['location', 'city', 'place'] }
    ]
  },

  // How to map ontology → external API
  exportMapping: {
    'role': 'q',           // Ontology 'role' → Indeed API 'q' param
    'location': 'l',       // Ontology 'location' → Indeed API 'l' param
    'salary': 'salary'     // Direct mapping
  },

  // How to lift external data → ontology
  importMapping: {
    '.job-title': 'role',        // CSS selector → Ontology attribute
    '.company-name': 'organization',
    '.salary-range': 'salary',
    '.location': 'location'
  }
}
```

**No Domain Hardcoding:** Skill triggers based on **ontology attribute patterns**, not `if (hasProp('role'))`.

### 3.2 Automatic Skill Execution
**Goal:** Ontology pattern matching triggers skills

**Flow:**
1. User creates note with properties from ontology
2. **Semantic Pattern Matcher:**
   - Query all skills for semantic patterns
   - Match note properties against skill requirements
   - Use ontology for fuzzy matching (`role`= `job` = `position`)
3. If match + previously approved → Execute
4. If new pattern → One-time approval modal
5. Execute → Results lifted into ontology as new notes

**Example:**
```
User note: [role:is:Engineer] [location:near:Boston]

Pattern Matcher:
  - role → string type, matches 'indeed-adapter'
  - location → geo type, matches 'indeed-adapter', 'zillow-adapter'
  - Confidence: 94%

Execute: indeed-adapter in background
```

### 3.3 Ontology Evolution from Results
**Goal:** Imported data enriches ontology

**After Skill Execution:**
1. Extract data from external system
2. **Ontology Analysis:**
   - Discover new attribute keys not in ontology
   - Infer types from data (number, string, date)
   - Suggest operators based on common patterns
3. **Prompt User:**
   ```
   "Found new attribute: 'remote-friendly'"
   Type: boolean (inferred)
   Add to ontology? [Yes] [No] [Always auto-add]
   ```

4. **Update Ontology:**
   - Add new attributes to relevant nodes
   - Share via Nostr to network (if public)
   - Other users benefit from enriched schema

**Ontology Grows:** Skills discover new properties, network evolves.

### 3.4 Universal Result Integration
**Goal:** All imported data becomes semantic notes

**Process:**
1. Skill scrapes external data (Indeed, Zillow, etc.)
2. **Semantic Transformer:**
   - Map external fields → Ontology attributes via skill's `importMapping`
   - Validate types against ontology
   - Apply default operators from ontology definitions
3. Create notes with:
   - Properties from ontology (validated)
   - Tags inferred from ontology node hierarchy
   - Source provenance (`source: {type: 'skill', identifier: 'indeed-v1'}`)
   - Linked to parent query note

**Example Result:**
```
Title: Software Engineer - Acme Corp

Properties (from ontology):
  [role:is:Software Engineer]       // Mapped from scraped data
  [organization:is:Acme Corp]       // Using ontology 'organization' attribute
  [location:is:Remote]              // Geo type from ontology
  [salary:greater than:100000]      // Number type, operator from ontology
  [source:is:indeed]                // Provenance

Tags: #work #job-request (from ontology node hierarchy)
Parent: "React Jobs Boston" query note
```

### 3.5 Skill Pattern Matching Logic
**Goal:** Semantic matching using ontology

**Algorithm:**
1. **Key Normalization:** Use ontology synonyms
   - `role` = `job` = `position` = `title` (defined in ontology metadata)
2. **Type Inference:** Missing explicit key? Infer from value pattern
   - Value is `$XXX-YYY` → Likely `salary` (number type in ontology)
   - Value is `lat,lng` → Likely`location` (geo type)
3. **Context Expansion:** Use ontology node relationships
   - Note has `deadline` → Implies `task` node → Include task-related skills
4. **Fuzzy Scoring:** Match confidence based on:
   - Attribute overlap (more matching attributes = higher confidence)
   - Type compatibility (geo matches geo, string matches string)
   - Operator compatibility (query uses `less than`, skill supports it)

**No Hardcoded Patterns:** All driven by ontology definitions.

### 3.6 Initial Skill Adapters
**Goal:** 3-5 proof-of-concept adapters

**Selected Skills:**
1. **Indeed** - Job aggregator (maps to `work` node in ontology)
2. **Zillow** - Housing (maps to `marketplace.housing` or new `housing` node)
3. **Eventbrite** - Events (maps to `event` node)
4. **Generic Web Scraper** - URL + CSS selectors → Properties
5. **Craigslist** - Multi-domain (jobs, housing, items)

**Each Skill:**
- Declares semantic pattern (ontology queries)
- Provides bidirectional mapping (ontology ↔ external API)
- No domain logic—just data transformation

---

## Phase 4: Ontology Management & Learning (Week 7-8)

### 4.1 Ontology Evolution Interface
**Goal:** Users curate and extend ontology

**Features:**
- **Add Attribute:** User discovers new property, adds to ontology
  - Define type, operators, description
  - System suggests based on usage patterns
- **Merge Attributes:** Recognize `salary` and `pay` are same concept
  - Ontology helper: `mergeAttributes('salary', 'pay')`
- **Create Nodes:** New domain emerges (e.g., "Education", "Health")
  - Add to ontology tree
  - Define child nodes and attributes
- **Share to Network:** Publish ontology updates via Nostr
  - Other users can adopt/fork
  - Network-wide consensus on core schema

### 4.2 Ontology-Driven Privacy
**Goal:** Privacy rules based on ontology

**Ontology Annotation:**
```typescript
{
  id: 'person',
  attributes: {
    name: { type: 'string', privacy: 'public-ok' },
    ssn: { type: 'string', privacy: 'always-private' },
    email: { type: 'string', privacy: 'user-choice' }
  }
}
```

**Privacy Enforcement:**
- Before publishing to Nostr: Check ontology privacy metadata
- Warn if note contains `always-private` attributes
- Auto-redact based on rules
- User overrides stored but logged

### 4.3 Smart Defaults from Ontology
**Goal:** System learns best practices

- **Frequent Properties:** Track which attributes commonly co-occur
  - `role` + `location` → Suggest `salary` next
- **Common Values:** Autocomplete based on ontology + usage
  - `role:is:___` → Top values: "Engineer", "Designer", "PM"
- **Template Generation:** Create templates from common node patterns
  - Frequently use `event` + `location` + `startDateTime` → Save as "Event Template"

### 4.4 Multi-Channel Management
**Goal:** Unified messaging using ontology properties

- **Channel Detection:** Message properties include `channel:is:whatsapp`
- **Contact Unification:** Merge contacts across platforms
  - Same `phone` → Same person node in ontology
- **Thread Linking:** Notes with same `conversationId` property
- All driven by semantic properties, not hardcoded platform logic

---

## Phase 5: Developer Tools (Week 9-10)

> **Note:** End-user functionality complete. This is for contributors.

### 5.1 Skill Adapter Builder
- Visual wizard to create semantic pattern definitions
- Test against ontology (does pattern match expected notes?)
- Generate export/import mappings
- Validate against ontology types

### 5.2 Ontology Testing Framework
- Unit tests for attribute definitions
- Validate operator compatibility
- Check for conflicting patterns
- Regression tests for ontology changes

### 5.3 Skill Execution Replay
- Record executions with ontology snapshot
- Replay with different ontology versions
- Compare results

---

## Phase 6: Optimization & Network Effects (Week 11-12)

> **Note:** Scale and polish.

### 6.1 Performance Optimization
- Index ontology for fast attribute lookup
- Cache semantic pattern matching results
- Lazy load ontology subtrees
- Optimize property parsing

### 6.2 Network-Wide Ontology Sharing
- Publish ontology updates to Nostr
- Subscribe to trusted ontology curators
- Merge/fork ontology versions
- Consensus mechanisms for core schema

### 6.3 Advanced Ontology Features
- **Computed Attributes:** `totalCost = price * quantity`
- **Conditional Operators:** "greater than" only if type is number
- **Cross-Node References:** `project` references `organization`
- **Temporal Versioning:** Track ontology changes over time

---

## Architecture Principles

### 1. Ontology is the Single Source of Truth
**Everything derives from ontology:**
- UI widgets → Generated from attribute types
- Property validation → Based on ontology operators
- Skill patterns → Semantic queries against ontology
- Privacy rules → Ontology metadata

### 2. External Systems Are Data Adapters
**Indeed, Zillow, etc. don't define domains.**
- They translate external schemas → Notention ontology
- Bidirectional mapping (export query, import results)
- No domain logic in skills, only data transformation
- Ontology evolves independently of external APIs

### 3. Network Effects Drive Evolution
**Ontology grows with usage:**
- Users discover new attributes → Add to ontology
- Patterns shared across network (Nostr)
- Consensus on core schema
- Forks for specialized domains

### 4. Zero Hardcoding
**No `if (key === 'job')` checks:**
- Fuzzy key matching from ontology synonyms
- Type-based routing (datetime → date picker)
- Operator-driven logic (less than → range query)
- Pattern matching, not string equality

### 5. Privacy by Design
**Ontology encodes privacy expectations:**
- Attributes marked as private/public
- Network gate checks ontology before transmission
- User override audited
- Default: private unless ontology says otherwise

---

## Implementation Timeline

| Phase | Focus | Duration | Ontology Impact |
|-------|-------|----------|----------------|
| **1** | MoltBot + Foundation | 2 weeks | Establish core attribute types for messaging |
| **2** | Ontology-Driven UI | 2 weeks | Generate widgets from ontology, NLP extraction |
| **3** | Semantic Skills | 2 weeks | Skills as adapters, import enriches ontology |
| **4** | Ontology Management | 2 weeks | User curation, network sharing, learning |
| **5** | Developer Tools | 2 weeks | Skill builder, ontology testing |
| **6** | Optimization | 2 weeks | Performance, network effects, advanced features |

**Total:** 12 weeks with ontology at the core throughout.

---

## Success Criteria

### Phase 1-2 (Foundation):
- [ ] Send message using ontology property (`send:to:contact`)
- [ ] UI widgets auto-generated from ontology attribute types
- [ ] Create note from natural language → Extract ontology properties
- [ ] Query builder populated from ontology attribute definitions

### Phase 3-4 (Skills & Evolution):
- [ ] Skill triggers based on ontology pattern, not hardcoded domain
- [ ] Scraped data lifted into ontology as validated properties
- [ ] User adds new attribute to ontology, system adapts
- [ ] Ontology shared to Nostr, other users import

### Phase 5-6 (Developer & Scale):
- [ ] Create new skill adapter using visual builder (no code)
- [ ] Ontology changes tested with regression suite
- [ ] Network-wide ontology merge with 10+ nodes

---

## Key Differences from Previous Version

### Removed:
- ❌ Hardcoded domain assumptions ("job search", "housing")
- ❌ Fixed skill patterns (e.g., `[role:*]` → Indeed)
- ❌ Manual skill suggestion buttons

### Added:
- ✅ Ontology-driven pattern matching
- ✅ Type-aware UI generation
- ✅ Skills as semantic data adapters
- ✅ Ontology evolution and network sharing
- ✅ Privacy rules in ontology metadata
- ✅ Zero hardcoding principle

### Philosophy:
**Before:** System knows about "jobs" and "housing"
**After:** System knows about **semantic properties** and **pattern matching**. "Jobs" emerge from ontology definitions, not source code.

External systems (Indeed, Zillow) are "necessary evil" scrapers that lift silo data into universal semantic space where it belongs.
