# Notention-ClawdBot Synthesis Plan
## Universal Semantic System with Security & Privacy

> **Mission:** Private by default, semantic by design. Universal matching. Skills as translators. Single-user utility first.

---

## Executive Summary

This plan merges three branches into a unified system where:
- **Notes** are universal semantic expressions (domain-agnostic properties)
- **Skills** translate between semantic space ↔ external systems (web/APIs/files)
- **ClawdBot** executes skills via browser automation, chat apps, system access
- **Privacy** is default (`public: false` firewall)
- **Noise** is managed (`priority` weighting)
- **UI** bridges natural language ↔ verified semantics

---

## Phase 0: Foundation Merge

### 0.1 Branch Synthesis
**Base branch:** `refactor/core-utils-consolidation` (strongest architecture)

```bash
cd /home/me/notention8

# Create synthesis branch
git checkout refactor/core-utils-consolidation-4150142945987950507
git checkout -b synthesis/universal-semantics-v1

# Cherry-pick critical fixes from fix-build-issues
git cherry-pick <commit-hash-esm-config>
git cherry-pick <commit-hash-missing-deps>
git cherry-pick <commit-hash-import-fixes>

# Copy verification artifacts from agent-integration-fix
git checkout agent-integration-fix-10156464261098769429 -- verification/
```

### 0.2 Build Verification
```bash
# Install dependencies
npm install --workspaces

# Build all packages
npm run build --workspaces

# Run tests
npm test --workspaces
```

**Success criteria:** All builds pass, no TypeScript errors, existing tests pass.

---

## Phase 1: Enhanced Data Model

### 1.1 Extend Note Interface
**File:** [core/src/types/index.ts](file:///home/me/notention8/core/src/types/index.ts)

**Current:**
```typescript
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  properties: Property[];
  createdAt: string;
  updatedAt: string;
  nostrEventId?: string;
  publishedAt?: string;
  pinned?: boolean;
  deletedAt?: string;
}
```

**Add:**
```typescript
export interface NoteSource {
  type: 'user' | 'skill' | 'import' | 'inference';
  identifier: string;  // 'user-<id>', 'skill-indeed-v1', 'gpt-4o'
  url?: string;        // Origin URL for imports
  timestamp: number;
}

export interface Note {
  // ... existing fields ...

  // PROVENANCE
  source: NoteSource;

  // PRIVACY FIREWALL (default: false)
  public: boolean;

  // SIGNAL STRENGTH (default: 1.0)
  priority: number;  // 0.0-1.0
}
```

**Implementation steps:**
1. Update interface in [core/src/types/index.ts](file:///home/me/notention8/core/src/types/index.ts)
2. Export `NoteSource` type
3. Add default values in note creation functions
4. Update [core/src/notes.ts](file:///home/me/notention8/core/src/notes.ts) helper functions


---

## Phase 2: Privacy Firewall

### 2.1 Network Gate
**File:** `core/src/networkGate.ts` (new)

```typescript
import type { Note } from './types';

export class NetworkGate {
  /**
   * Check if note can be transmitted over network
   * @throws {PrivacyError} if note is private and not confirmed
   */
  async canTransmit(
    note: Note,
    destination: string,
    promptUser?: (message: string) => Promise<boolean>
  ): Promise<boolean> {
    if (note.public) return true;

    if (!promptUser) {
      throw new PrivacyError(
        `Cannot transmit private note ${note.id} to ${destination}`
      );
    }

    const confirmed = await promptUser(
      `"${note.title}" is private. Make public to share with ${destination}?`
    );

    if (!confirmed) return false;

    // User confirmed - mark as public
    note.public = true;
    return true;
  }
}

export class PrivacyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrivacyError';
  }
}
```

### 2.2 Integrate with Nostr Publishing
**File:** [core/src/nostr.ts](file:///home/me/notention8/core/src/nostr.ts)

**Update `publishNoteToNostr` function:**
```typescript
import { NetworkGate, PrivacyError } from './networkGate';

const networkGate = new NetworkGate();

export async function publishNoteToNostr(
  note: Note,
  privkey: string,
  relays: string[],
  promptUser?: (msg: string) => Promise<boolean>
): Promise<void> {
  // Privacy check
  const canPublish = await networkGate.canTransmit(
    note,
    'Nostr network',
    promptUser
  );

  if (!canPublish) {
    throw new PrivacyError('Publication cancelled - note is private');
  }

  // ... existing Nostr publishing logic ...
}
```

### 2.3 UI Confirmation Modal
**File:** `ui/components/modals/PrivacyConfirmModal.tsx` (new)

```tsx
export function PrivacyConfirmModal({
  note,
  destination,
  onConfirm,
  onCancel
}: PrivacyConfirmProps) {
  return (
    <Modal>
      <h3>⚠️ Privacy Warning</h3>
      <p>
        "<strong>{note.title}</strong>" is currently <strong>private</strong>.
      </p>
      <p>Making it <strong>public</strong> will allow:</p>
      <ul>
        <li>Publishing to {destination}</li>
        <li>Discovery by other users</li>
        <li>Permanent visibility on P2P network</li>
      </ul>

      <div className="actions">
        <Button variant="secondary" onClick={onCancel}>
          Keep Private
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Make Public & Share
        </Button>
      </div>
    </Modal>
  );
}
```

---

## Phase 3: Priority System

### 3.1 Weighted Matching
**File:** [core/src/ontologyHelpers.ts](file:///home/me/notention8/core/src/ontologyHelpers.ts)

**Update `calculateMatchScore` function:**
```typescript
export function calculateMatchScore(
  note1: Note,
  note2: Note,
  ontology: OntologyNode[]
): number {
  // Calculate semantic overlap (existing logic)
  const semanticScore = calculateSemanticOverlap(
    note1.properties,
    note2.properties,
    ontology
  );

  // Weight by priority of the matched note
  const finalScore = semanticScore * note2.priority;

  return finalScore;
}
```

### 3.2 Visual Priority Indicators
**File:** [ui/components/sidebar/NoteGridItem.tsx](file:///home/me/notention8/ui/components/sidebar/NoteGridItem.tsx)

**Update component:**
```tsx
export function NoteGridItem({ note }: NoteGridItemProps) {
  const opacity = note.priority < 0.5 ? 0.5 : 1.0;
  const borderStyle = note.priority < 0.3 ? 'dashed' : 'solid';

  return (
    <div
      className="note-grid-item"
      style={{
        opacity,
        borderStyle,
        borderColor: note.public ? '#22c55e' : '#6b7280'
      }}
    >
      {/* Priority badge */}
      {note.priority < 0.5 && (
        <Badge variant="ghost" size="xs">
          Low Priority
        </Badge>
      )}

      {/* Provenance indicator */}
      {note.source.type === 'skill' && (
        <Tooltip content={`Imported from ${note.source.identifier}`}>
          <DownloadIcon className="w-3 h-3 text-gray-400" />
        </Tooltip>
      )}

      {/* ... rest of component ... */}
    </div>
  );
}
```

### 3.3 Priority Promotion
**File:** [ui/hooks/useNoteActions.ts](file:///home/me/notention8/ui/hooks/useNoteActions.ts)

```typescript
export function useNoteActions() {
  const promoteNote = useCallback((noteId: string) => {
    setNotes(prev => prev.map(note =>
      note.id === noteId
        ? { ...note, priority: 1.0 }
        : note
    ));
  }, []);

  // Auto-promote on edit
  const handleEdit = useCallback((noteId: string) => {
    promoteNote(noteId);
    // ... existing edit logic ...
  }, [promoteNote]);

  return { promoteNote, handleEdit };
}
```

---

## Phase 4: Skills System

### 4.1 Skill Interface
**File:** `core/src/skills/types.ts` (new)

```typescript
import type { Note } from '../types';

export interface PropertyPattern {
  keys: string[];
  operators?: string[];
  required?: boolean;
}

export interface ExternalAction {
  type: 'browser' | 'api' | 'file' | 'chat';
  config: BrowserAction | APIAction | FileAction | ChatAction;
}

export interface BrowserAction {
  url: string;
  steps: BrowserStep[];
  extractors: DataExtractor[];
}

export interface BrowserStep {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'scroll';
  selector?: string;
  value?: string;
  timeout?: number;
}

export interface DataExtractor {
  propertyKey: string;  // What property to create
  selector: string;     // CSS selector
  attribute?: string;   // Extract attribute vs text
  transform?: (raw: string) => any;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;

  // What semantic patterns trigger this skill?
  semanticPattern: PropertyPattern[];

  // Translate Note → External action
  export(note: Note): Promise<ExternalAction | null>;

  // Translate External data → Notes
  import(data: any): Promise<Note[]>;

  // Metadata
  domains?: string[];      // Hint: ['jobs', 'freelance']
  sources?: string[];      // ['indeed.com', 'linkedin.com']
  capabilities?: string[]; // ['search', 'post', 'scrape']
}
```

### 4.2 Example Skill: Indeed
**File:** `agent/src/skills/IndeedSkill.ts` (new)

```typescript
import type { Skill, Note } from '@notention/core';

export class IndeedSkill implements Skill {
  id = 'skill-indeed-v1';
  name = 'Indeed Job Board';
  description = 'Search and import job listings from Indeed.com';
  version = '1.0.0';

  semanticPattern = [
    { keys: ['role', 'skill', 'job'], required: true },
    { keys: ['salary', 'rate', 'budget'], required: false },
    { keys: ['location'], required: false }
  ];

  domains = ['jobs', 'employment', 'freelance'];
  sources = ['indeed.com'];
  capabilities = ['search', 'scrape'];

  async export(note: Note): Promise<ExternalAction | null> {
    // Extract semantic properties
    const role = this.extractPropertyValue(note, ['role', 'skill', 'job']);
    if (!role) return null;

    const location = this.extractPropertyValue(note, ['location']) || 'remote';
    const salary = this.extractPropertyValue(note, ['salary', 'rate']);

    return {
      type: 'browser',
      config: {
        url: `https://indeed.com/jobs?q=${encodeURIComponent(role)}&l=${encodeURIComponent(location)}`,
        steps: [
          { type: 'wait', timeout: 2000 },
          { type: 'scroll', value: 'bottom' }
        ],
        extractors: [
          {
            propertyKey: 'role',
            selector: '.jobTitle',
            transform: (text) => text.trim()
          },
          {
            propertyKey: 'company',
            selector: '.companyName',
            transform: (text) => text.trim()
          },
          {
            propertyKey: 'salary',
            selector: '.salary-snippet',
            transform: this.parseSalary
          },
          {
            propertyKey: 'url',
            selector: '.jobTitle',
            attribute: 'href',
            transform: (href) => `https://indeed.com${href}`
          }
        ]
      }
    };
  }

  async import(scrapedData: any[]): Promise<Note[]> {
    return scrapedData.map(job => ({
      id: this.generateId(),
      title: `Job: ${job.role} at ${job.company}`,
      content: `<p>Found on Indeed</p>`,
      tags: ['job-listing', 'imported'],
      properties: [
        { key: 'role', operator: 'is', values: [job.role] },
        { key: 'company', operator: 'is', values: [job.company] },
        ...(job.salary ? [{ key: 'salary', operator: 'is', values: [job.salary] }] : []),
        { key: 'url', operator: 'is', values: [job.url] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Provenance
      source: {
        type: 'skill',
        identifier: this.id,
        url: job.url,
        timestamp: Date.now()
      },

      // Privacy & Priority
      public: false,    // Imported data is private by default
      priority: 0.2     // Low priority (bulk import)
    }));
  }

  private extractPropertyValue(note: Note, keys: string[]): string | null {
    for (const prop of note.properties) {
      if (keys.includes(prop.key)) {
        return prop.values[0];
      }
    }
    return null;
  }

  private parseSalary(text: string): string {
    // Extract salary from text like "$80K - $100K a year"
    const match = text.match(/\$[\d,]+/);
    return match?.[0] || text;
  }

  private generateId(): string {
    return `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 4.3 Skill Registry
**File:** `agent/src/skills/SkillRegistry.ts` (new)

```typescript
import type { Skill, Note } from '@notention/core';

export class SkillRegistry {
  private skills = new Map<string, Skill>();

  register(skill: Skill): void {
    this.skills.set(skill.id, skill);
    console.log(`✅ Registered skill: ${skill.name} (${skill.id})`);
  }

  unregister(skillId: string): void {
    this.skills.delete(skillId);
  }

  findMatching(note: Note): Skill[] {
    const matching: Skill[] = [];

    for (const skill of this.skills.values()) {
      if (this.doesPatternMatch(note, skill.semanticPattern)) {
        matching.push(skill);
      }
    }

    return matching;
  }

  private doesPatternMatch(note: Note, patterns: PropertyPattern[]): boolean {
    for (const pattern of patterns) {
      const hasAnyKey = note.properties.some(prop =>
        pattern.keys.includes(prop.key)
      );

      if (pattern.required && !hasAnyKey) {
        return false;
      }
    }
    return true;
  }

  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }
}
```

### 4.4 Skill Coordinator
**File:** `agent/src/ClawdBotCoordinator.ts`

```typescript
import { Gateway } from './Gateway';
import { SkillRegistry } from './skills/SkillRegistry';
import { IndeedSkill } from './skills/IndeedSkill';
import type { Note } from '@notention/core';

export class ClawdBotCoordinator {
  private gateway: Gateway;
  private skillRegistry: SkillRegistry;

  constructor(gateway: Gateway) {
    this.gateway = gateway;
    this.skillRegistry = new SkillRegistry();

    // Register built-in skills
    this.skillRegistry.register(new IndeedSkill());
  }

  async processNote(note: Note): Promise<Note[]> {
    const matchingSkills = this.skillRegistry.findMatching(note);

    if (matchingSkills.length === 0) {
      console.log(`No matching skills for note: ${note.title}`);
      return [];
    }

    console.log(`Found ${matchingSkills.length} matching skills for: ${note.title}`);

    const allResults: Note[] = [];

    for (const skill of matchingSkills) {
      try {
        const action = await skill.export(note);
        if (!action) continue;

        const results = await this.executeAction(action, skill);
        allResults.push(...results);
      } catch (error) {
        console.error(`Error executing skill ${skill.name}:`, error);
      }
    }

    return allResults;
  }

  private async executeAction(action: ExternalAction, skill: Skill): Promise<Note[]> {
    if (action.type === 'browser') {
      return await this.executeBrowserAction(action.config, skill);
    }

    // TODO: Implement other action types
    return [];
  }

  private async executeBrowserAction(
    config: BrowserAction,
    skill: Skill
  ): Promise<Note[]> {
    // ClawdBot handles browser automation
    // For now, return mock data
    console.log(`[ClawdBot] Opening ${config.url}`);

    // In real implementation:
    // 1. ClawdBot opens browser
    // 2. Executes steps
    // 3. Extracts data using selectors
    // 4. Returns scraped data

    const mockScrapedData = [
      {
        role: 'React Developer',
        company: 'Startup XYZ',
        salary: '$80-100K',
        url: 'https://indeed.com/job/12345'
      }
    ];

    return await skill.import(mockScrapedData);
  }
}
```

---

## Phase 5: Hybrid Input UI

### 5.1 LLM Property Extraction
**File:** `ui/services/ai/propertyExtraction.ts` (new)

```typescript
import type { Property } from '@notention/core';

export async function extractPropertiesFromText(
  text: string,
  aiService: any
): Promise<Property[]> {
  const prompt = `
Extract semantic properties from this text in the format [key:operator:value].

Text: "${text}"

Output as JSON array of {key, operator, values} objects.
Operators: "is", "contains", "<", ">", "near"

Example:
Input: "Looking for React dev, max $80/hr, remote only"
Output: [
  {"key": "skill", "operator": "contains", "values": ["React"]},
  {"key": "rate", "operator": "<", "values": ["80"]},
  {"key": "remote", "operator": "is", "values": ["true"]}
]
`;

  const response = await aiService.complete(prompt);
  return JSON.parse(response);
}
```

### 5.2 Property Widgets
**File:** `ui/components/editor/PropertyWidget.tsx` (new)

```tsx
export function PropertyWidget({
  property,
  onChange,
  onRemove
}: PropertyWidgetProps) {
  const type = inferPropertyType(property);

  return (
    <div className="property-widget">
      <span className="property-key">{property.key}</span>

      <OperatorSelector
        value={property.operator}
        options={getOperatorsForType(type)}
        onChange={(op) => onChange({ ...property, operator: op })}
      />

      {type === 'number' && (
        <NumberSlider
          value={property.values[0]}
          onChange={(val) => onChange({ ...property, values: [val] })}
        />
      )}

      {type === 'enum' && (
        <Select
          value={property.values[0]}
          options={getEnumOptions(property.key)}
          onChange={(val) => onChange({ ...property, values: [val] })}
        />
      )}

      {type === 'boolean' && (
        <Toggle
          checked={property.values[0] === 'true'}
          onChange={(checked) => onChange({
            ...property,
            values: [checked.toString()]
          })}
        />
      )}

      <IconButton
        icon={TrashIcon}
        onClick={onRemove}
        variant="ghost"
        size="sm"
      />
    </div>
  );
}
```

### 5.3 Hybrid Editor
**File:** `ui/components/editor/HybridInput.tsx` (new)

```tsx
export function HybridInput() {
  const [text, setText] = useState('');
  const [suggestedProps, setSuggestedProps] = useState<Property[]>([]);
  const { extractPropertiesFromText } = useAI();

  // Extract properties as user types
  const handleTextChange = useDebouncedCallback(async (newText: string) => {
    setText(newText);

    if (newText.length > 20) {
      const extracted = await extractPropertiesFromText(newText);
      setSuggestedProps(extracted);
    }
  }, 500);

  return (
    <div className="hybrid-input">
      <Editor
        value={text}
        onChange={handleTextChange}
        placeholder="Describe what you want..."
      />

      {suggestedProps.length > 0 && (
        <div className="suggested-properties">
          <h4>Proposed Properties:</h4>
          {suggestedProps.map((prop, i) => (
            <PropertyWidget
              key={i}
              property={prop}
              onChange={(updated) => {
                const next = [...suggestedProps];
                next[i] = updated;
                setSuggestedProps(next);
              }}
              onRemove={() => {
                setSuggestedProps(prev =>
                  prev.filter((_, idx) => idx !== i)
                );
              }}
            />
          ))}
        </div>
      )}

      <Button onClick={() => createNote(text, suggestedProps)}>
        Create Note
      </Button>
    </div>
  );
}
```

---

## Phase 6: Feedback System

### 6.1 Feedback Interface
**File:** `core/src/feedback/types.ts` (new)

```typescript
export interface Feedback {
  id: string;
  entityId: string;
  entityType: 'note' | 'skill' | 'match' | 'suggestion' | 'property';
  value: number;  // -1 to +1
  context?: {
    reason?: string;
    details?: string;
  };
  timestamp: number;
}
```

### 6.2 Feedback Collector
**File:** `agent/src/feedback/FeedbackCollector.ts` (new)

```typescript
export class FeedbackCollector {
  private feedbackStore: Map<string, Feedback[]> = new Map();

  async recordFeedback(feedback: Feedback): Promise<void> {
    const entity = this.feedbackStore.get(feedback.entityId) || [];
    entity.push(feedback);
    this.feedbackStore.set(feedback.entityId, entity);

    // Trigger learning
    await this.updateSkillPriority(feedback);
  }

  private async updateSkillPriority(feedback: Feedback): Promise<void> {
    if (feedback.entityType !== 'skill') return;

    const allFeedback = this.feedbackStore.get(feedback.entityId) || [];
    const avgScore = allFeedback.reduce((sum, f) => sum + f.value, 0) / allFeedback.length;

    // Adjust skill activation threshold based on feedback
    console.log(`Skill ${feedback.entityId} avg score: ${avgScore}`);
  }
}
```

### 6.3 Feedback UI
**File:** `ui/components/common/FeedbackWidget.tsx` (new)

```tsx
export function FeedbackWidget({ entityId, entityType }: FeedbackWidgetProps) {
  const [showDetailed, setShowDetailed] = useState(false);
  const { recordFeedback } = useFeedback();

  const submit = (value: number, context?: any) => {
    recordFeedback({
      id: generateId(),
      entityId,
      entityType,
      value,
      context,
      timestamp: Date.now()
    });
  };

  return (
    <div className="feedback-widget">
      <IconButton
        icon={ThumbsUpIcon}
        onClick={() => submit(1)}
        title="Helpful"
      />
      <IconButton
        icon={ThumbsDownIcon}
        onClick={() => submit(-1)}
        title="Not helpful"
      />
      <IconButton
        icon={MessageIcon}
        onClick={() => setShowDetailed(true)}
        title="Provide details"
      />

      {showDetailed && (
        <DetailedFeedbackModal
          onSubmit={(reason, details) => {
            submit(-0.5, { reason, details });
            setShowDetailed(false);
          }}
          onClose={() => setShowDetailed(false)}
        />
      )}
    </div>
  );
}
```

---

## Implementation Timeline

### Week 1: Foundation
- [x] Branch synthesis
- [ ] Enhanced Note data model
- [ ] Build verification
**Goal:** Clean foundation with extended types

### Week 2: Security & Skills
- [ ] NetworkGate implementation
- [ ] Privacy modal UI
- [ ] IndeedSkill example
- [ ] SkillRegistry
**Goal:** Privacy firewall + one working skill

### Week 3: Priority & UI
- [ ] Weighted matching
- [ ] Visual priority indicators
- [ ] Property widgets
- [ ] Hybrid input editor
**Goal:** Noise management + better UX

### Week 4: Integration
- [ ] ClawdBot coordinator
- [ ] Feedback system
- [ ] End-to-end testing
- [ ] Documentation
**Goal:** Complete workflow working

---

## Verification Checklist

### Privacy
- [ ] Private note blocked from Nostr publishing
- [ ] Confirmation modal appears
- [ ] Note marked public after confirmation
- [ ] NetworkGate prevents leaks

### Skills
- [ ] IndeedSkill activates for job notes
- [ ] Browser automation runs (mock or real)
- [ ] Imported notes have correct metadata
- [ ] Priority = 0.2 for bulk imports

### Priority
- [ ] Low-priority notes visually dimmed
- [ ] Editing note promotes to priority = 1.0
- [ ] Match scores weighted by priority
- [ ] High-priority notes sort higher

### Hybrid UI
- [ ] Text extraction suggests properties
- [ ] Widgets render correctly
- [ ] User can edit/remove suggestions
- [ ] Final note has verified properties

### Feedback
- [ ] Thumbs up/down recorded
- [ ] Detailed feedback modal works
- [ ] Feedback stored and retrieved
- [ ] (Future) Feedback affects behavior

---

## File Reference Map

| Component | File | Status |
|-----------|------|--------|
| Note interface | [core/src/types/index.ts](file:///home/me/notention8/core/src/types/index.ts) | Extend |
| NetworkGate | `core/src/networkGate.ts` | Create |
| Nostr publishing | [core/src/nostr.ts](file:///home/me/notention8/core/src/nostr.ts) | Update |
| Weighted matching | [core/src/ontologyHelpers.ts](file:///home/me/notention8/core/src/ontologyHelpers.ts) | Update |
| Skill types | `core/src/skills/types.ts` | Create |
| IndeedSkill | `agent/src/skills/IndeedSkill.ts` | Create |
| SkillRegistry | `agent/src/skills/SkillRegistry.ts` | Create |
| Coordinator | `agent/src/ClawdBotCoordinator.ts` | Create |
| Property extraction | `ui/services/ai/propertyExtraction.ts` | Create |
| PropertyWidget | `ui/components/editor/PropertyWidget.tsx` | Create |
| HybridInput | `ui/components/editor/HybridInput.tsx` | Create |
| FeedbackWidget | `ui/components/common/FeedbackWidget.tsx` | Create |
| Privacy modal | `ui/components/modals/PrivacyConfirmModal.tsx` | Create |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Build success | 100% |
| Existing tests passing | 100% |
| Privacy: Private notes blocked | 100% |
| Skills: Pattern matching accuracy | >80% |
| Priority: Correct visual rendering | 100% |
| UI: Property extraction accuracy | >70% |
| User can create job note → see results | Yes |
| Single-user utility (no network needed) | Yes |

---

## Next Steps After Completion

1. **More Skills:** CraigslistSkill, LinkedInSkill, GitHubSkill
2. **Skill Recorder:** UI for creating custom skills
3. **ClawdHub Integration:** Community skill sharing
4. **Advanced Feedback:** Reinforcement learning
5. **Chat Interface:** WhatsApp/Telegram integration
6. **Multi-skill Routing:** Higher-level coordinator skills

---

## References

- **Branch comparison:** [branch_comparison.md](file:///home/me/.gemini/antigravity/brain/af4da072-db22-4a0d-9492-1387404a66da/branch_comparison.md)
- **VoltAgent docs:** https://voltagent.ai/docs
- **Nostr protocol:** https://github.com/nostr-protocol/nips
- **Existing ClawdBot Gateway:** [agent/src/Gateway.ts](file:///home/me/notention8/agent/src/Gateway.ts)
- **Existing Plugin system:** [agent/src/plugins/PluginInterface.ts](file:///home/me/notention8/agent/src/plugins/PluginInterface.ts)
