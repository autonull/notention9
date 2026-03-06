# Notention UI/UX Specification

**Version:** 2.0  
**Status:** Ready for Implementation  
**Last Updated:** March 2026

---

## Executive Summary

Notention is a **private-first intention coordination system** that feels like a TODO list but enables semantic matching between notes. This specification defines a UI/UX that is simple enough for anyone to use while powerful enough for complex coordination.

**Core Insight:** Users should never need to learn semantics to benefit from them.

---

## Design Principles

### 1. TODO-List Simplicity
> Anyone who can use email can use Notention.

- Zero learning curve for basic note-taking
- No required semantics—plain text works perfectly
- Progressive discovery—features reveal through use

### 2. Privacy by Default
> Think without an audience.

- All notes are private unless explicitly published
- Local matching works without any network connection
- Publishing is deliberate, opt-in, per-note

### 3. Durable Statements
> Notes are coordinates, not chat messages.

- Each note is a persistent, referenceable object
- Notes can be found, matched, reorganized across time
- Spatial/relational, not linear/temporal

### 4. Invisible Semantics
> Power without complexity.

- Semantic details are never required syntax
- Details appear as natural language blocks inline with text
- AI extraction is optional, reviewable, editable

### 5. Inline Everything
> No context switching.

- Details flow within the document, not in sidebars
- Editing happens in place, not in modals
- Matches appear below content, not in separate views

### 6. Local-First Matching
> Match against yourself before matching the world.

- Your notes match against your other notes automatically
- Network matching is an extension of local matching
- Matches are always visible when they exist

### 7. Adaptive AI
> Help when you want it, silent when you don't.

- Off mode: No AI suggestions
- Reactive mode (default): Suggest when patterns detected, always asks first
- User controls mode in settings

---

## Core Concepts (4 Total)

| Concept | Definition | Example |
|---------|------------|---------|
| **Note** | A durable statement you create | "Looking for a developer" |
| **Detail** | Structured information in a note | `budget: < $5,000` |
| **Connection** | When two notes match | Your job post finds a developer |
| **Privacy** | Who can see this note | Private (default) or Public |

**Internal Terms (Development Only):**
- `Property` → Detail (data structure)
- `PropertyBlock` → Detail (UI component)
- `Ontology` → Vocabulary (schema)
- `Matching` → Finding Connections (algorithm)

---

## User Journeys

### Journey 1: The TODO User (No Semantics)

```
Opens app → Sees note list → Clicks [+ New] →
Types "Buy groceries" → Sees it in list → Done.
```

**Experience:** A simple multi-note TODO list. Never sees properties, matching, or network.

**Entry Point:** This is where everyone starts.

---

### Journey 2: The Power User (Local Semantics)

```
Creates note → Types "Need React developer, budget $5k" →
System offers to extract details → User accepts →
Details appear as inline blocks → System shows 2 local matches →
User clicks match → Views matching note.
```

**Experience:** Natural language → automatic structure. Their notes find each other. All private.

**Discovery:** Details make matching work. Notes have hidden structure.

---

### Journey 3: The Network User (P2P Coordination)

```
Has private notes with details → Decides to publish one →
Clicks privacy toggle → Confirms publication →
Note appears on network → Matches arrive from peers →
User reviews matches → Connects with best match.
```

**Experience:** Publishing is one click (with confirmation). Network matches appear alongside local.

**Gain:** Access to global intention coordination. Privacy preserved for non-published notes.

---

## Information Architecture

### Top-Level Views

```
┌─────────────────────────────────────────┐
│ NOTENTION                    [+ New] ⚙️ │
├─────────────────────────────────────────┤
│                                         │
│  📝 Notes          (default view)       │
│  💬 Chats                               │
│  🗺️ Map                                 │
│  📅 Timeline                            │
│  🌐 Network                             │
│                                         │
├─────────────────────────────────────────┤
│ Selected Note Preview / Quick Actions   │
└─────────────────────────────────────────┘
```

---

## Note List View

```
╔═══════════════════════════════════════════════════════════╗
║  NOTENTION                              [+ New]  🔍  ⚙️   ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  📝 Notes                                     [Sort ▼]   ║
║  ════════════════════════════════════════════════════    ║
║                                                           ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ 📝 Senior React Developer Needed        🔒  💫 2    │ ║
║  │    Looking for a React developer with 5+ years...   │ ║
║  │    Updated 2 hours ago                              │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                           ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ 📝 Office Space in Austin               🔒  💫 1    │ ║
║  │    Need 1000+ sqft, budget $3k/month...             │ ║
║  │    Updated yesterday                                │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                           ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ 📝 I am a React Developer               🌐  💫 12   │ ║
║  │    Available for hire, $75/hr, remote OK...         │ ║
║  │    Updated 3 days ago                               │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Legend:
🔒 = Private note
🌐 = Published to network
💫 N = N connections found
```

**Key Affordances:**
- Looks like an email inbox / TODO app
- Privacy indicator (subtle, right side)
- Connection count (when connections exist)
- Title + preview + timestamp
- Nothing else required

---

## Note Editor View

```
╔═══════════════════════════════════════════════════════════════╗
║  ← Back    [Senior React Developer Needed_______]  🔒  📡  ⋮ ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │                                                         │ ║
║  │  Looking for a                                          │ ║
║  │  ┌───────────────────────────────────────────────────┐ ║ │
║  │  │ 💼 role: React Developer                  [edit]  │ ║ │
║  │  └───────────────────────────────────────────────────┘ ║ │
║  │                                                         │ ║
║  │  with                                                    │ ║
║  │  ┌───────────────────────────────────────────────────┐ ║ │
║  │  │ ⏱ experience: > 5 years                   [edit]  │ ║ │
║  │  └───────────────────────────────────────────────────┘ ║ │
║  │                                                         │ ║
║  │  budget of                                               │ ║
║  │  ┌───────────────────────────────────────────────────┐ ║ │
║  │  │ 💰 budget: < $6,000/month                 [edit]  │ ║ │
║  │  └───────────────────────────────────────────────────┘ ║ │
║  │                                                         │ ║
║  │  ─────────────────────────────────────────────────────  │ ║
║  │                                                         │ ║
║  │  Additional notes:                                      │ ║
║  │  Must have TypeScript experience. Modern React patterns │ ║
║  │  (hooks, concurrent features). Small team, high impact. │ ║
║  │                                                         │ ║
║  │  ─────────────────────────────────────────────────────  │ ║
║  │                                                         │ ║
║  │  [+ Add a detail]                                        │ ║
║  │                                                         │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  💫 2 Connections Found                           [Refresh]   ║
║  ════════════════════════════════════════════════════════    ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ 👤 John Doe                                 ⭐ 94%  🔒  │  ║
║  │ 💼 React Developer • 📍 Austin • 💰 $5k/mo             │  ║
║  │ "Available immediately, 7 years experience..."         │  ║
║  │ [View Note] [Start Chat]                               │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ 👤 Jane Smith                               ⭐ 87%  🌐  │  ║
║  │ 💼 Full-stack (React) • 📍 Remote • 💰 $4.5k/mo        │  ║
║  │ "Specialized in React/Node, available part-time..."    │  ║
║  │ [View Note] [Start Chat]                               │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Component Specifications

### Detail Block States

#### Display State (Default)
```
┌───────────────────────────────────────────────────────┐
│ 💼 role: React Developer                      [edit]  │
└───────────────────────────────────────────────────────┘
```

#### Edit State (After clicking [edit])
```
┌───────────────────────────────────────────────────────┐
│ 💼 role:                                              │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Value: React Developer                          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  [✓ Save]  [✗ Cancel]                                 │
└───────────────────────────────────────────────────────┘
```

#### Creation State (After typing natural language)
```
┌───────────────────────────────────────────────────────┐
│ ✨ Add a detail?                                      │
│                                                       │
│  Budget: < $5,000                                     │
│                                                       │
│  [Add]  [Edit]  [Skip]                                │
└───────────────────────────────────────────────────────┘
```

---

### Detail Block Density Rules (v1.0)

| Detail Count | Display |
|--------------|---------|
| 1-5 | Show all as full blocks |
| 6+ | Show 5, then "[+N more ▼]" |

**Visual Weight:**
- Margin above/below: 12px
- Padding inside: 16px
- Border radius: 8px
- Background: `rgba(59, 130, 246, 0.08)`
- Border: `rgba(59, 130, 246, 0.2)`

---

### Privacy Toggle States

#### Private (Default)
```
┌─────────────┐
│ 🔒 Private  │
└─────────────┘
```

#### Public (Published)
```
┌──────────────┐
│ 🌐 Public    │
│ 📡 12 matches│
└──────────────┘
```

#### Publishing (In Progress)
```
┌─────────────────┐
│ 📡 Publishing...│
└─────────────────┘
```

---

### Match Panel States

#### No Connections (Private Note)
```
┌───────────────────────────────────────────────────────┐
│ No connections found yet                              │
│                                                       │
│ Your note doesn't match any other notes right now.    │
│                                                       │
│ Tips:                                                 │
│ • Add more specific details                           │
│ • Check if other notes exist                          │
│                                                       │
│ [+ Add a detail]                                      │
└───────────────────────────────────────────────────────┘
```

#### No Connections (Public Note)
```
┌───────────────────────────────────────────────────────┐
│ Listening for network connections...      📡 Active   │
│                                                       │
│ Your note is published. Connections will appear here. │
│                                                       │
│ ───────────────────────────────────────────────────── │
│                                                       │
│ 💫 2 Local Connections                                │
│ [Show local connections ▼]                            │
└───────────────────────────────────────────────────────┘
```

#### With Connections
```
┌───────────────────────────────────────────────────────┐
│ 💫 5 Connections Found                    [Refresh]   │
│                                                       │
│ Filter: [All ▼]  Sort: [Best Match ▼]                │
│                                                       │
│ ───────────────────────────────────────────────────── │
│                                                       │
│ ┌───────────────────────────────────────────────────┐│
│ │ 👤 John Doe                          ⭐ 94%  🔒   ││
│ │ 💼 React Developer • 📍 Austin • 💰 $5k/mo        ││
│ │ "Available immediately, 7 years experience..."     ││
│ │ [View Note] [Start Chat]                          ││
│ └───────────────────────────────────────────────────┘│
│                                                       │
│ ┌───────────────────────────────────────────────────┐│
│ │ 👤 Jane Smith                        ⭐ 87%  🌐   ││
│ │ 💼 Full-stack (React) • 📍 Remote • 💰 $4.5k/mo   ││
│ │ "Specialized in React/Node, available part-time..."││
│ │ [View Note] [Start Chat]                          ││
│ └───────────────────────────────────────────────────┘│
│                                                       │
│ [Show 3 more connections ▼]                           │
└───────────────────────────────────────────────────────┘
```

---

## Value Proposition Messaging

### Empty State (No Details Yet)
```
┌───────────────────────────────────────────────────────┐
│ Add details to find connections                       │
│                                                       │
│ Details help your notes find each other.              │
│ Examples:                                             │
│                                                       │
│ • "budget $500" → finds notes mentioning $500         │
│ • "location Austin" → finds Austin-related notes      │
│ • "deadline Friday" → finds time-sensitive notes      │
│                                                       │
│ [+ Add a detail]                                      │
└───────────────────────────────────────────────────────┘
```

### After First Detail Added
```
┌───────────────────────────────────────────────────────┐
│ Details added: 1                                      │
│                                                       │
│ Add more details for better connections.              │
└───────────────────────────────────────────────────────┘
```

### Publishing Benefits
```
┌───────────────────────────────────────────────────────┐
│ 📡 Publish to Network                                 │
│                                                       │
│ Currently: 🔒 Private (only you can see)              │
│                                                       │
│ Local matching works fully in private mode.           │
│                                                       │
│ Publish to also find connections from other users     │
│ on the network. You can make it private again         │
│ anytime.                                              │
│                                                       │
│ [Publish] [Keep Private]                              │
└───────────────────────────────────────────────────────┘
```

---

## AI Assistance Settings

### AI Modes

| Mode | Behavior | Availability |
|------|----------|--------------|
| **Off** | No AI suggestions. Plain text only. | v1.0 |
| **Reactive** (default) | Suggest when patterns detected. Always asks before inserting. | v1.0 |
| **Proactive** | Ghost text as you type. Tab to accept, continue typing to dismiss. | Phase 6 |
| **Automatic** | Auto-insert >95% confidence. Ctrl+Z undoes. | Phase 6 |

### Settings UI (v1.0)
```
┌─────────────────────────────────────────┐
│  AI Assistance                          │
├─────────────────────────────────────────┤
│                                         │
│  AI Mode:                               │
│                                         │
│  ○ Off                                  │
│    No AI suggestions                    │
│                                         │
│  ● Reactive (recommended)               │
│    Suggest when patterns detected       │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  [✓] Learn from my corrections          │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Coming in Phase 6:                     │
│  ○ Proactive                            │
│    Ghost text as you type, Tab to accept│
│                                         │
│  ○ Automatic                            │
│    Auto-insert high-confidence patterns │
│                                         │
└─────────────────────────────────────────┘
```

### Reactive Mode Behavior (v1.0)

**Always show preview, never auto-apply:**
```
User types: "budget under 5000"
            ↓
User presses Enter or clicks "Add a detail"
            ↓
Popup appears:
┌─────────────────────────────────────────┐
│ ✨ Add a detail?                        │
│                                         │
│ Budget: < $5,000                        │
│                                         │
│ [Add] [Edit] [Skip]                     │
└─────────────────────────────────────────┘
```

**Undo:** Ctrl+Z always undoes AI insertions.

---

### Proactive Mode Specification (Phase 6)

**Status:** Deferred to Phase 6 for additional technical specification and user testing.

**Behavior:**
```
User types: "Looking for a React devel"
            ↓
Ghost text appears (gray, faded, non-intrusive):
"Looking for a React developer with 5 years experience"
            ↓
User presses Tab → Accept ghost text
User continues typing → Dismiss ghost text
User presses Esc → Dismiss ghost text
```

**Technical Requirements (To Be Specified):**
- Tiptap GhostTextExtension
- Confidence threshold for showing suggestions (>70%)
- Debouncing to avoid excessive suggestions (>500ms after typing)
- Visual styling (gray, 50% opacity, non-selectable)
- Interaction handling (Tab accept, Esc dismiss, continue typing dismiss)

**User Testing Required:**
- Does ghost text feel helpful or intrusive?
- What confidence threshold feels right?
- Should it be opt-in or opt-out?
- Does it interfere with normal typing flow?

**Decision Criteria for Phase 6:**
- User testing shows >70% find it helpful (not annoying)
- Technical implementation doesn't impact editor performance
- Clear visual distinction from user-typed text

**Why Deferred:**
1. Requires additional technical specification (Tiptap extension)
2. Needs user testing to validate helpfulness vs. intrusion
3. Performance implications (real-time suggestions)
4. v1.0 Reactive mode provides AI assistance with lower risk

---

### Automatic Mode Specification (Phase 6)

**Status:** Deferred to Phase 6 for additional technical specification and user testing.

**Behavior:**
```
User types: "budget under 5000" and presses Enter
            ↓
Auto-inserted (no popup):
┌─────────────────────────────────────────┐
│ 💰 budget: < $5,000             [edit]  │
└─────────────────────────────────────────┘
            ↓
Brief notification: "Detail added. Ctrl+Z to undo"
```

**Confidence Thresholds:**
| Confidence | Action |
|------------|--------|
| > 95% | Auto-insert, show brief notification |
| 90-95% | Auto-insert, subtle highlight |
| < 90% | Show Reactive popup (ask first) |

**Technical Requirements (To Be Specified):**
- Confidence scoring algorithm
- Notification system
- Undo stack integration
- User preference for threshold

**User Testing Required:**
- Do users trust auto-insert?
- Is Ctrl+Z discoverable enough?
- What false-positive rate is acceptable?

**Why Deferred:**
1. Requires high confidence in extraction accuracy
2. Users need to build trust with AI first (via Reactive mode)
3. Higher risk of user frustration from wrong insertions

---

## Implementation Phases

### Phase 1: TODO Foundation (Week 1-2)

**Goal:** Working multi-note TODO list with zero semantics.

**Deliverables:**
- [ ] Note list view (title, preview, timestamp)
- [ ] Note editor (plain text only, Tiptap basic)
- [ ] Create, read, update, delete notes
- [ ] Search notes (title + content)
- [ ] Sort by date/title
- [ ] Privacy toggle (visual only, no publishing)
- [ ] Local storage persistence (LocalForage)

**Success Metric:** User can maintain a TODO list with multiple notes.

---

### Phase 2: Inline Details (Week 3-4)

**Goal:** Details as inline blocks, natural language extraction.

**Deliverables:**
- [ ] Detail Block component (display/edit states)
- [ ] Detail extraction popup
- [ ] Natural language detection (regex-based MVP)
- [ ] Inline detail editing
- [ ] Detail reordering (drag-drop)
- [ ] Detail deletion
- [ ] Tiptap PropertyBlockExtension

**Success Metric:** User can add details via natural language, edit inline.

**User Testing (End of Week 4):**
- Test with 5 users
- Validate detail block visual weight
- Test extraction accuracy
- Adjust before Phase 3

---

### Phase 3: Local Matching (Week 5-6)

**Goal:** Notes match against each other locally.

**Deliverables:**
- [ ] Match Panel component
- [ ] Local matching engine integration
- [ ] Match card display
- [ ] Match filtering/sorting
- [ ] Click to view match note
- [ ] Match count badge in list view

**Success Metric:** User sees their notes finding each other automatically.

---

### Phase 4: Publishing & Network (Week 7-8)

**Goal:** Optional publishing, network matching.

**Deliverables:**
- [ ] Privacy toggle with confirmation
- [ ] Nostr publishing integration
- [ ] Network match subscription
- [ ] Combined local + network matches
- [ ] Match indicators in list view
- [ ] Offline mode handling

**Success Metric:** User can publish a note and receive network matches.

---

### Phase 5: Polish (Week 9-10)

**Goal:** Performance, accessibility, edge cases.

**Deliverables:**
- [ ] Keyboard navigation (all views)
- [ ] Mobile responsive design
- [ ] Accessibility audit & fixes
- [ ] Performance optimization
- [ ] Error handling
- [ ] Onboarding flow
- [ ] Animations & transitions

**Success Metric:** App feels polished, works on all devices, accessible.

---

### Phase 6: AI Enhancements (Post-v1.0)

**Goal:** Proactive and Automatic AI modes.

**Deliverables:**
- [ ] Tiptap GhostTextExtension
- [ ] Proactive mode (ghost text as you type)
- [ ] Automatic mode (auto-insert >95% confidence)
- [ ] Confidence scoring system
- [ ] User testing and validation

**Success Metric:** >70% of users find proactive AI helpful, not intrusive.

**Technical Specification Required:**
- Ghost text rendering performance (<16ms)
- Confidence threshold calibration
- Debouncing strategy
- Visual design (50% opacity, non-selectable)

**User Testing Required:**
- A/B test: Reactive vs. Proactive vs. Automatic
- Measure: Helpfulness vs. annoyance
- Iterate based on feedback

**Note:** Phase 6 begins only after v1.0 ships and Phase 2-5 designs are validated.

---

## Success Metrics

### Usability Metrics
```
Time to First Note:     < 10 seconds
Time to First Detail:   < 60 seconds
Time to First Match:    < 2 minutes
Task Success Rate:      > 90%
System Usability Scale: > 80
```

### Engagement Metrics
```
Daily Active / Monthly Active: > 40%
Notes Created per User per Week: > 5
Details per Note (avg): > 2
Connection Acceptance Rate: > 30%
Publishing Rate: > 10% of active users
```

### Retention Metrics
```
Day 1 Retention:  > 60%
Day 7 Retention:  > 40%
Day 30 Retention: > 25%
```

### Technical Metrics
```
Initial Load:         < 2 seconds
Note List Render:     < 100ms (100 notes)
Editor Input Latency: < 16ms (60fps)
Detail Block Insert:  < 100ms
Match Panel Load:     < 500ms (100 matches)
Search Results:       < 200ms (1000 notes)
Publish to Network:   < 3 seconds
```

---

## Visual Design System

### Color Palette
```css
/* Backgrounds */
--bg-primary: #111827;
--bg-secondary: #1f2937;
--bg-tertiary: #374151;

/* Text */
--text-primary: #f9fafb;
--text-secondary: #9ca3af;
--text-tertiary: #6b7280;

/* Accents */
--accent-primary: #3b82f6;
--accent-success: #10b981;
--accent-warning: #f59e0b;
--accent-danger: #ef4444;

/* Semantic Colors */
--privacy-private: #6b7280;
--privacy-public: #10b981;
--match-high: #10b981;
--match-medium: #3b82f6;
--match-low: #f59e0b;
```

### Typography
```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
```

### Spacing
```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.25rem;
--space-6: 1.5rem;
--space-8: 2rem;
```

---

## Keyboard Shortcuts

### Global
| Action | Shortcut |
|--------|----------|
| New Note | `Ctrl+N` |
| Search | `Ctrl+/` |
| Command Palette | `Ctrl+K` |
| Close/Back | `Esc` |

### Editor
| Action | Shortcut |
|--------|----------|
| Save | `Ctrl+S` |
| Insert Detail | `Ctrl+Enter` |
| Navigate Details | `↑/↓` |
| Edit Detail | `Enter` |

### Match Panel
| Action | Shortcut |
|--------|----------|
| Focus Matches | `Ctrl+M` |
| Open Selected Match | `Enter` |
| Start Chat | `C` |
| Navigate Matches | `↑/↓` |

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

**Color Contrast:**
- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

**Keyboard Navigation:**
- All interactive elements focusable
- Visible focus indicators
- Logical tab order
- No keyboard traps

**Screen Reader Support:**
- Semantic HTML structure
- ARIA labels for icons
- Live regions for dynamic content

**Motion:**
- Respect `prefers-reduced-motion`
- No auto-playing animations

---

## Technical Dependencies

### Frontend Framework
- React 18+
- TypeScript 5+
- Vite (build tool)

### Editor
- Tiptap (ProseMirror-based)
- Custom extensions for detail blocks

### State Management
- React Context (settings, view state)
- LocalForage (local storage)
- Nostr tools (network sync)

### Styling
- Tailwind CSS
- CSS Modules (component-specific)

### Testing
- Vitest (unit tests)
- Playwright (E2E tests)
- React Testing Library

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Detail blocks feel heavy | Medium | High | User test week 4, adjust visual weight |
| Matches feel irrelevant | Medium | High | 60% threshold, show explanations |
| Privacy confusion | Low | Critical | Clear modal, neutral messaging |
| Mobile UX compromised | Medium | Medium | Mobile-first testing, adaptations |
| Performance degradation | Medium | High | Performance budgets, monitoring |
| Network effects slow | High | Medium | Focus on local matching first |

---

## Open Questions (Research Needed)

| Question | Research Method | Timeline |
|----------|-----------------|----------|
| Is "Detail" the right term? | A/B test with users | Phase 2 |
| Is 5 the right collapse threshold? | User testing | Phase 2 |
| Full-width blocks vs. inline chips? | User testing | Phase 2 |
| Reactive vs. Proactive AI preference? | A/B test | Phase 6 |
| What confidence threshold for auto-insert? | Data analysis | Phase 6 |

---

## Phase 6 AI Modes: Technical Notes

**Proactive Mode (Ghost Text)**

Technical specification to be completed before Phase 6:
- Tiptap extension architecture
- Suggestion engine integration
- Performance optimization (<16ms render)
- Visual design system integration

**Automatic Mode**

Technical specification to be completed before Phase 6:
- Confidence scoring algorithm
- Extraction accuracy benchmarks (>95% for auto-insert)
- Undo/redo integration
- User trust calibration

**Decision Gate for Phase 6:**
- v1.0 shipped and stable
- Phase 2-5 user testing complete
- Technical specification complete
- Team capacity available

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `ARCHITECTURE.md` | System architecture, matching logic, parser details |
| `README.md` | Project overview, getting started |
| `TODO.md` | Development roadmap, implementation priorities |
| `AGENTS.md` | Code guidelines, development standards |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | March 2026 | Initial specification |
| 1.1 | March 2026 | Added AI settings, terminology guide, density rules |
| 2.0 | March 2026 | Simplified to 4 concepts, focused scope, implementation-ready |
| 2.1 | March 2026 | Added detailed Phase 6 AI specification (Proactive/Automatic modes) |

---

**End of Specification**

*Last updated: March 2026*  
*Version: 2.1*  
*Status: Ready for Implementation*
