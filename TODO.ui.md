# Notention UI/UX Specification

**Version:** 3.0  
**Status:** Living Document — Implementation Guide  
**Last Updated:** March 2026

---

## Vision

> **Notention is the operating system for human intention.**

At the individual level, it is a private semantic notebook — a TODO list that understands what you mean.  
At the civilizational level, it is a coordination layer that lets demand find supply without intermediaries, surveillance, or permission.

The UI must serve both. Every design decision should feel natural at the personal scale while being architecturally capable of scaling to millions of coordinating nodes.

---

## Foundational Design Principles

### 1. Layers of Disclosure
> The system has infinite depth. Nobody should feel it.

- **Layer 0 — Plain Text:** Write anything. It just works.
- **Layer 1 — Structured Details:** Opt-in. Inline blocks if you want them.
- **Layer 2 — Local Matching:** Your notes find each other automatically.
- **Layer 3 — Network Coordination:** Publish to reach the world.
- **Layer 4 — Agent Execution:** Notes become tasks the system acts on.
- **Layer 5 — Ontology / Developer Mode:** Shape the language itself.

Users inhabit whichever layer feels right. Layers do not bleed into each other uninvited.

### 2. Privacy by Default, Sovereignty Always
> You own your graph. The network is an extension, not the foundation.

- All data is local-first. No account required to start.
- Publishing is deliberate, per-note, reversible.
- Privacy state is always visible, never ambiguous.
- Cryptographic identity via Nostr keypair — generated locally, held by user.

### 3. Semantic Gravity
> Meaning accretes naturally. Never force it.

- Plain text is first-class. Semantic properties are always optional.
- AI suggests; humans decide. Auto-extraction requires explicit confirmation.
- The ontology evolves from usage — not from a preset schema.

### 4. Intent as the Unit of Coordination
> A note is not a document. It is a coordinate in possibility space.

- Each note expresses either a **Fact** (`is`) or a **Constraint** (`<`, `>`, `contains`…).
- The matching engine finds notes that satisfy each other's constraints.
- This is the protocol. The UI surfaces it without requiring the user to understand it.

### 5. Thought-to-Action Continuity
> Notention bridges thinking and doing.

- Notes can be passive (stored intention) or active (agent task).
- The transition from note → action is one toggle, not a paradigm shift.
- Agent feedback flows back into the note inline — no separate "task manager."

### 6. Civilization-Scale Awareness
> Individual sovereignty + collective coordination.

- Each user node is fully autonomous.
- Emergent ontology convergence enables cross-network matching without a central schema.
- The UI should never feel like a centralized app with a distributed backend. It should feel like a node that is genuinely sovereign but also genuinely connected.

---

## Core Concepts (User-Facing)

| Concept | What It Is | What It Feels Like |
|---------|------------|--------------------|
| **Note** | A durable, semantic statement | A smart sticky note |
| **Detail** | Structured property in a note | A named fact or constraint |
| **Connection** | Two notes that satisfy each other | A match, a lead, an opportunity |
| **Action** | A note the agent is executing on | A task in progress |
| **Network** | The P2P layer where published notes live | The world listening |

**Internal ↔ User Terminology:**
| Internal | UI Label |
|----------|----------|
| `Property` | Detail |
| `PropertyBlock` | Detail block |
| `Ontology` | Vocabulary / Schema |
| `Matching` | Finding Connections |
| `Agent` | Assistant / Actor |
| `Nostr keypair` | Your identity |

---

## User Journeys

### Journey 0: The Skeptic (0 minutes in)
```
Opens app → Sees clean empty list →
Types "Remember to call dentist" → Sees it saved →
Closes app. Done.
```
*Nothing asked of them. No signup. No tutorial. The value is immediate.*

---

### Journey 1: The TODO User (Day 1)
```
Opens app → Creates several notes →
Organizes them → Searches → Sorts →
Uses it like a private notebook forever.
```
*Notention is indistinguishable from a beautiful note app. That's fine. This is a legitimate end state.*

---

### Journey 2: The Power User (Week 1)
```
Creates note: "Need React dev, TypeScript, budget $5k/mo" →
System offers to extract details → User accepts →
Inline blocks appear: [role: React Developer] [budget: <$5k] →
System shows 2 local matches (other notes they wrote) →
"Oh, interesting — my notes are talking to each other."
```
*Discovery of the latent coordination layer happens organically.*

---

### Journey 3: The Networked Agent (Month 1)
```
Has private notes with details → Publishes one →
Network matches arrive from peers →
Starts a chat with a match →
Completes a real-world coordination.
```
*The app becomes a personal P2P coordination node.*

---

### Journey 4: The Actor (Advanced)
```
Writes: "Research 3BR apartments in Austin under $2k, move-in Nov" →
Toggles note to "Active" mode →
Agent searches sites, imports structured results as child notes →
User reviews, picks one, note becomes a decision record.
```
*A note becomes an intent the system executes on your behalf.*

---

### Journey 5: The Ontologist (Developer / Advanced)
```
Opens Developer Mode →
Views ontology graph (keys as nodes, co-occurrence as edges) →
Prunes duplicate keys, defines aliases →
Exports ontology for sharing with collaborators →
Their notes and yours align semantically across the network.
```
*Shaping the language that the network speaks.*

---

### Journey 6: The Civilization Builder (Collective)
```
A community defines a shared ontology (housing, skills, goods) →
Hundreds of members publish notes →
Semantic matching creates a local coordination marketplace →
No platform, no middleman, no fees.
```
*The system's true potential: decentralized needs-matching at community and civilizational scale.*

---

## Information Architecture

### Top-Level Navigation

```
┌─────────────────────────────────────────────────────┐
│  NOTENTION                              [+ New]  ⚙️  │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  📝 Notes    │  Main content area                   │
│  🔗 Network  │                                      │
│  🗺️  Map     │                                      │
│  📅 Timeline │                                      │
│  ⚡ Actions  │                                      │
│  🔬 Dev Mode │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

**Navigation Visibility Rules:**
| View | Visible To | Unlock |
|------|-----------|--------|
| Notes | Everyone (default) | — |
| Network | Everyone | — |
| Map | Everyone | — |
| Timeline | Everyone | — |
| Actions | Users with agent connected | On first agent use |
| Dev Mode | Opt-in | Settings toggle |

---

## View Specifications

### Notes View (Default)

```
╔══════════════════════════════════════════════════════════╗
║  NOTENTION                           [+ New]  🔍  ⚙️     ║
╠══════════════════════════════════════════════════════════╣
║  📝 Notes                                    [Sort ▼]    ║
║  ══════════════════════════════════════════════════════  ║
║                                                          ║
║  ┌──────────────────────────────────────────────────┐   ║
║  │ 📝 Senior React Developer Needed     🔒  💫 2    │   ║
║  │    Looking for React dev, TypeScript, 5+ yrs...  │   ║
║  │    Updated 2 hours ago                           │   ║
║  └──────────────────────────────────────────────────┘   ║
║                                                          ║
║  ┌──────────────────────────────────────────────────┐   ║
║  │ ⚡ Research Austin apartments         🔒  ▶ 3/7  │   ║
║  │    Agent working — 3 of 7 results found...       │   ║
║  │    Started 10 minutes ago                        │   ║
║  └──────────────────────────────────────────────────┘   ║
║                                                          ║
║  ┌──────────────────────────────────────────────────┐   ║
║  │ 📝 I am a React Developer             🌐  💫 12  │   ║
║  │    Available for hire, $75/hr, remote OK...      │   ║
║  │    Updated 3 days ago                            │   ║
║  └──────────────────────────────────────────────────┘   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

Legend:
🔒 Private    🌐 Published    💫N Connections    ▶ N/T Agent progress
```

**Note Card Anatomy:**
- **Icon:** 📝 = static note, ⚡ = active agent task, 🗂️ = collection
- **Title:** Editable inline on double-click
- **Preview:** First 100 chars of content, truncated
- **Timestamp:** Relative ("2 hours ago", "yesterday")
- **Privacy badge:** Right-aligned, always visible
- **Connection badge:** Only shown when N > 0
- **Agent progress:** Only shown when agent is active

---

### Note Editor View

```
╔════════════════════════════════════════════════════════════════╗
║  ← Back   [Senior React Developer Needed_____________]  🔒  ⋮  ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │                                                          │ ║
║  │  Looking for a                                           │ ║
║  │  ┌────────────────────────────────────────────────────┐  │ ║
║  │  │ 💼 role: React Developer                  [edit]   │  │ ║
║  │  └────────────────────────────────────────────────────┘  │ ║
║  │                                                          │ ║
║  │  with                                                    │ ║
║  │  ┌────────────────────────────────────────────────────┐  │ ║
║  │  │ ⏱ experience: > 5 years                   [edit]   │  │ ║
║  │  └────────────────────────────────────────────────────┘  │ ║
║  │                                                          │ ║
║  │  budget of                                               │ ║
║  │  ┌────────────────────────────────────────────────────┐  │ ║
║  │  │ 💰 budget: < $6,000/month                 [edit]   │  │ ║
║  │  └────────────────────────────────────────────────────┘  │ ║
║  │                                                          │ ║
║  │  ────────────────────────────────────────────────────    │ ║
║  │  Must have TypeScript experience. Modern React.          │ ║
║  │                                                          │ ║
║  │  [+ Add a detail]                                        │ ║
║  │                                                          │ ║
║  └──────────────────────────────────────────────────────────┘ ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  💫 2 Connections Found                           [Refresh]    ║
║  ════════════════════════════════════════════════════════════  ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ 👤 John Doe                               ⭐ 94%  🔒    │  ║
║  │ 💼 React Dev • 📍 Austin • 💰 $5k/mo                    │  ║
║  │ "Available immediately, 7 years experience..."           │  ║
║  │ [View Note]  [Start Chat]                               │  ║
║  └─────────────────────────────────────────────────────────┘  ║
╚════════════════════════════════════════════════════════════════╝
```

**Toolbar (⋮ menu):**
- Toggle active/passive mode (enable agent execution)
- Toggle developer view (show raw properties)
- Duplicate note
- Delete note
- Export as Markdown / JSON
- View note history

---

### Network View

```
╔════════════════════════════════════════════════════════════════╗
║  🌐 Network                    [My Relays ▼]  [Filter ▼]       ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  📡 Connected to 3 relays  |  👁 47 notes visible  |  ⚡ Live  ║
║                                                                ║
║  ──────────────────────────────────────────────────────────── ║
║                                                                ║
║  [My Published Notes (2)]  [Incoming Matches (5)]  [Browse]   ║
║                                                                ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ 🌐 React Developer Available          ⭐ 94%  🔁 3      │  ║
║  │ 💼 React Dev • 📍 Remote • 💰 $75/hr                    │  ║
║  │ Posted 6 hours ago by npub1xyz...                        │  ║
║  │ [View] [Start Chat] [Import as Note]                    │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

**Network View Tabs:**
- **My Published:** Notes I've published + their network match count
- **Incoming Matches:** Network notes that match my private notes
- **Browse:** Explore all visible notes (with semantic filter)
- **Relays:** Relay management, health status, latency

---

### Map View

Spatial representation of notes as nodes in 2D space.

- **Position:** Notes cluster by semantic similarity (embedding-based layout)
- **Color:** By category (`role/`, `location/`, `price/`, etc.)
- **Size:** By connection count
- **Zoom:** From personal cluster → community → global network
- **Click:** Opens note editor panel on right
- **Drag:** Manually reposition for personal organization

*The map is the civilization view. At full zoom-out, you see the shape of collective intention.*

---

### Timeline View

Chronological view optimized for time-sensitive notes.

- Notes with `[deadline:is:...]` or `[when:is:...]` properties populate automatically
- Grouped by day/week/month
- Agent tasks show execution windows
- Completed connections shown as resolved items

---

### Actions View (Agent Tasks)

```
╔════════════════════════════════════════════════════════════════╗
║  ⚡ Actions                                    [+ New Task]     ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  RUNNING (1)                                                   ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ ⚡ Research Austin apartments        ▶ ████░░░░ 38%      │  ║
║  │ 3 of 7 results imported • Est. 2 min remaining           │  ║
║  │ [Pause] [View Results] [Cancel]                         │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                ║
║  QUEUED (2)                                                    ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ ⏳ Find freelance clients in Berlin   Waiting            │  ║
║  │ [Edit] [Cancel]                                         │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                ║
║  COMPLETED (5)                         [Show All ▼]            ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ ✅ Research hiking boot options      Done — 8 results   │  ║
║  │ Completed 2 hours ago                                   │  ║
║  │ [View Results] [Re-run]                                 │  ║
║  └─────────────────────────────────────────────────────────┘  ║
╚════════════════════════════════════════════════════════════════╝
```

---

### Developer Mode

Accessible via Settings toggle. Adds to all views:

- **Raw properties panel:** See `[key:op:value]` AST alongside rendered blocks
- **Ontology Graph:** Interactive network of property keys, type inference, co-occurrence
- **Parser Debugger:** Live parse output for any text snippet
- **Matcher Tester:** Create two notes, see detailed match score breakdown
- **Simulator:** Spawn virtual agents (freelancers, clients, etc.), run coordination cycles
- **Network Inspector:** Raw Nostr events, relay messages, subscription filters

---

## Component Specifications

### Detail Block States

#### Display State
```
┌──────────────────────────────────────────────────────┐
│ 💼 role: React Developer                     [edit]  │
└──────────────────────────────────────────────────────┘
```

#### Edit State
```
┌──────────────────────────────────────────────────────┐
│ 💼 role:                                             │
│  ┌────────────────────────────────────────────────┐  │
│  │ Value: React Developer              [type ▼]   │  │
│  └────────────────────────────────────────────────┘  │
│  Operator: [is ▼]                                    │
│  [✓ Save]  [✗ Cancel]  [🗑 Delete]                   │
└──────────────────────────────────────────────────────┘
```

Operator options by detected type:
- **String:** `is`, `contains`, `excludes`, `starts with`
- **Number:** `is`, `<`, `>`, `<=`, `>=`, `in range`
- **Date:** `is`, `before`, `after`, `within`, `recurring`
- **Enum:** `is one of`, `excludes`

#### AI Suggestion State
```
┌──────────────────────────────────────────────────────┐
│ ✨ Add a detail?                                     │
│                                                      │
│  💰 budget: < $5,000                                │
│                                                      │
│  [Add]  [Edit]  [Skip]                              │
└──────────────────────────────────────────────────────┘
```

*AI never auto-inserts. Always shows this confirmation in Reactive mode.*

#### Inline Syntax Display (Developer Mode)
```
┌──────────────────────────────────────────────────────┐
│ 💼 role: React Developer                     [edit]  │
│ ▸ [role:is:React Developer]                          │
└──────────────────────────────────────────────────────┘
```

---

### Detail Block Density

| Count | Behavior |
|-------|----------|
| 1–5 | All shown as full blocks |
| 6–9 | Show 5, then `[+N more ▼]` |
| 10+ | Collapsed by default, `[Show all details ▼]` |

**Visual Weight:**
```css
margin: 12px 0;
padding: 12px 16px;
border-radius: 8px;
background: rgba(59, 130, 246, 0.08);
border: 1px solid rgba(59, 130, 246, 0.2);
```

**Icon mapping by key prefix:**
| Key pattern | Icon |
|-------------|------|
| `role`, `job`, `skill`, `title` | 💼 |
| `budget`, `price`, `salary`, `cost` | 💰 |
| `location`, `city`, `country`, `remote` | 📍 |
| `deadline`, `date`, `when`, `start` | 📅 |
| `experience`, `years`, `seniority` | ⏱ |
| `contact`, `email`, `phone` | 📬 |
| `status`, `state`, `stage` | 🚦 |
| *(default)* | 🏷️ |

---

### Privacy Toggle

#### Private (Default)
```
┌──────────────┐
│ 🔒 Private   │
└──────────────┘
```

#### Published
```
┌───────────────────┐
│ 🌐 Published      │
│ 📡 12 matches     │
└───────────────────┘
```

#### Confirmation Dialog (on intent to publish)
```
┌──────────────────────────────────────────────────────┐
│ Publish this note?                                   │
│                                                      │
│ Your note will be visible to anyone on the           │
│ Nostr network. It will be signed with your           │
│ cryptographic identity.                              │
│                                                      │
│ You can make it private again at any time.           │
│                                                      │
│ [Publish]  [Keep Private]                           │
└──────────────────────────────────────────────────────┘
```

*Messaging is factual and neutral. No fear-mongering, no pressure.*

---

### Match / Connection Panel

#### Empty — No Details
```
┌──────────────────────────────────────────────────────┐
│ Add details to discover connections                  │
│                                                      │
│ Details make your notes machine-readable. The        │
│ matching engine finds other notes that complement    │
│ yours.                                               │
│                                                      │
│ Examples:                                            │
│ • "budget < $5k"  →  finds offers within budget     │
│ • "location Austin"  →  finds local notes           │
│ • "role React Developer"  →  finds talent/jobs      │
│                                                      │
│ [+ Add a detail]                                    │
└──────────────────────────────────────────────────────┘
```

#### Empty — Published, Listening
```
┌──────────────────────────────────────────────────────┐
│ 📡 Listening for network connections...    Active    │
│                                                      │
│ Your note is on the network. Connections appear      │
│ here as peers publish matching notes.                │
│                                                      │
│ 💫 2 local connections                              │
│ [Show local ▼]                                      │
└──────────────────────────────────────────────────────┘
```

#### With Connections
```
┌──────────────────────────────────────────────────────┐
│ 💫 5 Connections                          [Refresh]  │
│                                                      │
│ Filter: [All ▼]   Sort: [Best Match ▼]              │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ 👤 John Doe                      ⭐ 94%  🔒    │  │
│ │ 💼 React Dev • 📍 Austin • 💰 $5k/mo          │  │
│ │ "Available immediately, 7 years exp..."         │  │
│ │ Matched: role ✓ experience ✓ budget ✓          │  │
│ │ [View Note]  [Start Chat]                      │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ [Show 3 more ▼]                                     │
└──────────────────────────────────────────────────────┘
```

**Match card details:**
- Match score (star + percentage)
- Privacy indicator of matched note
- Key details (role, location, price)
- Snippet from note content
- Matched constraint explanation ("Matched: role ✓ budget ✓")
- Actions: View Note, Start Chat, Dismiss

---

### Active Note (Agent Task) View

When a note is set to active, the agent execution panel appears below the editor:

```
╔════════════════════════════════════════════════════════════════╗
║  ← Back   [Research Austin Apartments__________]  🔒  ⚡ ⋮    ║
╠════════════════════════════════════════════════════════════════╣
║  [Note editor with details above...]                           ║
╠════════════════════════════════════════════════════════════════╣
║  ⚡ Agent Working                         [Pause] [Cancel]     ║
║  ════════════════════════════════════════════════════════════  ║
║                                                                ║
║  ▶ ████████░░░░░░░░░░ 38% — 3 of 7 results found              ║
║                                                                ║
║  🔧 Browsing Craigslist Austin Housing...                      ║
║  ✅ Imported: "2BR Bouldin Creek - $1,850/mo"                  ║
║  ✅ Imported: "3BR East Austin - $1,950/mo"                    ║
║  ✅ Imported: "Studio + office Hyde Park - $1,400/mo"          ║
║  ⏳ Browsing Zillow...                                          ║
║                                                                ║
║  Results appear as connected notes below ↓                    ║
╚════════════════════════════════════════════════════════════════╝
```

**Agent feedback principles:**
- Real-time streaming output (not batch)
- Every action logged (`🔧 Doing X`, `✅ Done`, `⚠️ Error`)
- Results imported as child notes, visible immediately
- User can pause, resume, or cancel at any time
- After completion: summary + "Re-run" + "Edit task" options

---

### Chat / Direct Connection View

When a match connection is initiated:

```
╔════════════════════════════════════════════════════════════════╗
║  ← Back    💬 John Doe                      🔒 E2E Encrypted   ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ┌──────────────────────────────────────┐                      ║
║  │ Context: [Senior React Dev Needed]  │                      ║
║  │ Match score: ⭐ 94%                  │                      ║
║  └──────────────────────────────────────┘                      ║
║                                                                ║
║  Hi! I saw your note about a React role. I'm available        ║
║  from next month and specialize in TypeScript + hooks.        ║
║                                                                ║
║  ────────────────────────────────────────                      ║
║                                                                ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Type a message...                                      │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

- All chat is E2E encrypted via Nostr DMs
- Context note pinned at top
- Match score visible
- Can share notes, invite to see non-public notes

---

## Ontology & Developer Mode Components

### Ontology Graph View
```
┌─────────────────────────────────────────────────────────────┐
│ Ontology Graph                  [Filter ▼] [Export] [Prune] │
│                                                             │
│        budget ──── price                                    │
│          │                                                  │
│   role ──┤── experience                                     │
│          │                                                  │
│       location ── city ── remote                           │
│                                                             │
│  ● = high frequency   ○ = low frequency                     │
│  Thickness = co-occurrence strength                         │
│                                                             │
│  Selected: "budget" (42 uses, type: number, inferred)       │
│  Aliases: price, cost, fee ($)                              │
│  [Merge with "price"] [Mark deprecated] [Set type →]       │
└─────────────────────────────────────────────────────────────┘
```

### Simulator View
```
┌─────────────────────────────────────────────────────────────┐
│ Simulator                       [New Scenario] [Run] [Stop] │
│                                                             │
│  Scenario: Gig Economy                                      │
│  ─────────────────────────                                  │
│  Agents: 5 freelancers, 3 clients                           │
│  Cycle: 0 → publish → match → report                        │
│                                                             │
│  Results (last run):                                        │
│  ✅ Match rate: 87%    ⚡ Latency: 23ms    🔁 Cycles: 10    │
│                                                             │
│  [Agent Log ▼]   [Match Graph ▼]   [Export Report]         │
└─────────────────────────────────────────────────────────────┘
```

---

## AI Assistance

### Modes

| Mode | Behavior | Phase |
|------|----------|-------|
| **Off** | No AI. Pure text. | v1.0 |
| **Reactive** *(default)* | Suggests after you pause/enter. Always asks before inserting. | v1.0 |
| **Proactive** | Ghost text as you type. Tab to accept. | Phase 6 |
| **Automatic** | Auto-inserts at >95% confidence. Ctrl+Z undoes. | Phase 6 |

### Reactive Mode (v1.0 default)

```
User types: "budget under 5000"
            ↓  (User presses Enter or pauses)
AI popup:
┌──────────────────────────────────────┐
│ ✨ Add a detail?                     │
│                                      │
│  💰 budget: < $5,000                │
│                                      │
│  [Add]  [Edit]  [Skip]              │
└──────────────────────────────────────┘
```

**Rules:**
- Never auto-apply, always shows preview first
- Show confidence indicator if <80% ("Not sure — please review")
- Ctrl+Z always undoes AI insertions
- "Learn from my corrections" toggle in settings

### Gardener (Background AI)
- Scans notes periodically (not on every keystroke)
- Infers property types from values
- Suggests ontology consolidations
- Never modifies notes without explicit permission
- Activity shown in Developer Mode log

---

## Settings

```
┌──────────────────────────────────────────────────────┐
│ ⚙️ Settings                                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  IDENTITY                                            │
│  Public Key: npub1xyz...          [Copy] [Rotate]    │
│  Display Name: [____________]                        │
│                                                      │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  AI ASSISTANCE                                       │
│  Mode:  ● Reactive  ○ Off                            │
│  [✓] Learn from my corrections                       │
│  LLM Provider: [Gemini ▼]                            │
│                                                      │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  NETWORK                                             │
│  Relays: relay.damus.io, nos.lol (+1 more)  [Edit]   │
│                                                      │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  DEVELOPER MODE                                      │
│  [  ] Enable Developer Mode                          │
│  [ ] Show raw property syntax in editor              │
│                                                      │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  DATA                                                │
│  [Export All Notes]  [Import]  [Clear Local Data]    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

### Global
| Action | Shortcut |
|--------|----------|
| New Note | `Ctrl+N` |
| Search | `Ctrl+/` or `Ctrl+F` |
| Command Palette | `Ctrl+K` |
| Back / Close | `Esc` |
| Toggle Dev Mode | `Ctrl+Shift+D` |

### Note Editor
| Action | Shortcut |
|--------|----------|
| Save | `Ctrl+S` |
| Insert Detail | `Ctrl+Enter` |
| Navigate Details | `↑/↓` in detail list |
| Edit Focused Detail | `Enter` |
| Toggle Active (Agent) | `Ctrl+Shift+A` |
| Toggle Privacy | `Ctrl+Shift+P` |

### Match Panel
| Action | Shortcut |
|--------|----------|
| Focus Match Panel | `Ctrl+M` |
| Open Match | `Enter` |
| Start Chat | `C` |
| Dismiss Match | `D` |
| Navigate Matches | `↑/↓` |

### Network View
| Action | Shortcut |
|--------|----------|
| Refresh | `Ctrl+R` |
| Filter | `Ctrl+F` |

---

## Onboarding Flow

### First Launch (Zero State)
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    📝 Notention                              │
│                                                              │
│           Your private semantic workspace.                   │
│                                                              │
│     Think of it as a notebook that understands you —        │
│     and connects you with others who need what you have.    │
│                                                              │
│              [Create your first note →]                      │
│                                                              │
│              Skip setup — just start writing                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Onboarding principles:**
- No forced tutorial. "Skip" is always available.
- First interaction = value delivered (note created)
- Features discovered through use, not explained upfront
- Contextual tips appear at moment of first relevant action

**Contextual tip triggers:**
| Moment | Tip |
|--------|-----|
| After 3 notes created | "Add details to your notes to find connections →" |
| After first detail added | "Now your notes can find each other automatically." |
| After first connection | "You found a connection! Click to view the matching note." |
| After 10 local connections | "Publish a note to reach people beyond your workspace." |

---

## Responsive & Multi-Platform

### Desktop (Primary)
- Two-column layout: Note list + Editor with match panel below
- Developer mode adds third column (ontology/inspector)
- Keyboard-first navigation

### Tablet
- Single column by default, note list slides in from left
- Editor takes full width
- Match panel as collapsible bottom drawer

### Mobile
- Full-screen note list → tap to open editor
- Match panel as bottom sheet (pull up)
- Simplified editor toolbar
- Developer mode hidden (accessible in settings)

### PWA (Offline)
- All core features work offline
- Queue publishes for when network returns
- Local matching always available
- Agent tasks that require network clearly labeled

---

## Accessibility

### WCAG 2.1 AA Compliance
- **Contrast:** Text 4.5:1 min, large text 3:1, UI components 3:1
- **Keyboard:** All interactive elements focusable, logical tab order, no traps
- **Screen readers:** Semantic HTML, ARIA labels for icons, live regions for dynamic updates
- **Motion:** Respect `prefers-reduced-motion`; no auto-playing animations

### Focus Management
- Focus returns to trigger element on modal close
- New note: focus jumps to title field immediately
- After AI suggestion dismissed: focus returns to editor cursor

---

## Visual Design System

### Color Palette
```css
/* Backgrounds */
--bg-primary:    #0f172a;
--bg-secondary:  #1e293b;
--bg-tertiary:   #334155;
--bg-surface:    #1e293b;

/* Text */
--text-primary:   #f8fafc;
--text-secondary: #94a3b8;
--text-muted:     #64748b;

/* Accents */
--accent-blue:    #3b82f6;
--accent-teal:    #14b8a6;
--accent-green:   #10b981;
--accent-yellow:  #f59e0b;
--accent-red:     #ef4444;
--accent-purple:  #a855f7;

/* Semantic */
--privacy-private:  #64748b;
--privacy-public:   #10b981;
--match-high:       #10b981;
--match-medium:     #3b82f6;
--match-low:        #f59e0b;
--agent-active:     #a855f7;
--agent-done:       #10b981;
```

### Typography
```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

--text-xs:   0.75rem;
--text-sm:   0.875rem;
--text-base: 1rem;
--text-lg:   1.125rem;
--text-xl:   1.25rem;
--text-2xl:  1.5rem;
--text-3xl:  1.875rem;
```

### Spacing
```css
--space-1: 0.25rem;  --space-2: 0.5rem;
--space-3: 0.75rem;  --space-4: 1rem;
--space-5: 1.25rem;  --space-6: 1.5rem;
--space-8: 2rem;     --space-12: 3rem;
--space-16: 4rem;
```

### Motion
```css
--transition-fast:   150ms ease;
--transition-base:   250ms ease;
--transition-slow:   400ms ease;
--spring:            cubic-bezier(0.34, 1.56, 0.64, 1);
```

Detail block insertion: slide-down + fade-in (`250ms spring`)  
Match card appearance: stagger fade-in (`150ms * index`)  
Agent progress: smooth bar fill (real-time, no animation loops)

---

## Success Metrics

### Usability
```
Time to First Note Created:   < 10 seconds
Time to First Detail Added:   < 60 seconds
Time to First Connection:     < 3 minutes
Task Success Rate (core flows): > 90%
System Usability Scale:       > 80
```

### Engagement
```
Daily Active / Monthly Active:      > 40%
Notes per User per Week:            > 5
Details per Note (avg):             > 2
Connection Acceptance Rate:         > 30%
Publishing Rate (active users):     > 10%
Agent Task Completion Rate:         > 75%
```

### Coordination Effectiveness
```
Local Match Rate (notes with 3+ details): > 60%
Network Match Latency:                    < 2 seconds
Successful Connections (chat initiated):  > 15%
Community Ontology Convergence:           > 70% shared keys at 10 nodes
```

### Technical
```
Initial Load:              < 2s
Note List Render (100):    < 100ms
Editor Input Latency:      < 16ms (60fps)
Detail Block Insert:       < 100ms
Match Panel Load (100):    < 500ms
Search (1000 notes):       < 200ms
Publish to Network:        < 3s
Agent Task Startup:        < 500ms
```

---

## Implementation Phases

### Phase 1: TODO Foundation (Weeks 1–2)
**Goal:** Working multi-note workspace. Zero required semantics.

- [ ] Note list (title, preview, timestamp, sort)
- [ ] Note editor (Tiptap, plain text)
- [ ] Create / Read / Update / Delete notes
- [ ] Search (title + content)
- [ ] Privacy toggle (visual only)
- [ ] LocalForage persistence
- [ ] Responsive layout (desktop + mobile)

*Exit criteria: User can maintain a TODO list without friction.*

---

### Phase 2: Inline Details (Weeks 3–4)
**Goal:** Details as inline blocks. Natural language extraction.

- [ ] Detail Block component (display / edit / creation states)
- [ ] Tiptap PropertyBlockExtension
- [ ] AI extraction popup (Reactive mode only)
- [ ] Inline detail editing + delete
- [ ] Detail reordering (drag-drop)
- [ ] Detail density collapse behavior
- [ ] Icon mapping by key prefix

*User testing (end of week 4): 5 users, validate visual weight + extraction accuracy.*

---

### Phase 3: Local Matching (Weeks 5–6)
**Goal:** Notes match against each other locally.

- [ ] Match / Connection Panel component
- [ ] Local matching engine integration
- [ ] Match card (score, details, explanation, actions)
- [ ] Filter + sort controls
- [ ] Match count badge in list view
- [ ] Click match → open note editor

*Exit criteria: A user with 10+ detailed notes sees connections without any configuration.*

---

### Phase 4: Network & Publishing (Weeks 7–8)
**Goal:** Nostr publishing, network matches.

- [ ] Privacy toggle with confirmation dialog
- [ ] Nostr keypair generation (local, never transmitted)
- [ ] Nostr publishing integration
- [ ] Network match subscription
- [ ] Combined local + network match panel
- [ ] Network View (basic)
- [ ] Relay management in settings
- [ ] Offline queue for pending publishes

*Exit criteria: Two users on separate instances connect via published notes.*

---

### Phase 5: Agent Tasks (Weeks 9–10)
**Goal:** Notes can become active agent tasks.

- [ ] Note "Active" toggle
- [ ] Actions View (running / queued / completed)
- [ ] Agent real-time feedback panel (streaming log)
- [ ] Child note creation from agent results
- [ ] Pause / cancel task
- [ ] Task history

*Exit criteria: User writes a research note, activates it, agent imports results.*

---

### Phase 6: Polish & Accessibility (Weeks 11–12)
**Goal:** Production quality, all devices, full keyboard support.

- [ ] Full keyboard navigation
- [ ] WCAG 2.1 AA audit + fixes
- [ ] Mobile UX pass (bottom sheets, touch targets)
- [ ] Transitions + micro-animations
- [ ] Error states + offline handling
- [ ] Onboarding contextual tips
- [ ] Performance audit + optimization

---

### Phase 7: Developer Mode & Ontology Tools (Weeks 13–14)
**Goal:** Power users can inspect, shape, and share the semantic layer.

- [ ] Developer Mode toggle
- [ ] Raw property display in editor
- [ ] Ontology Graph component (keys, types, co-occurrence)
- [ ] Parser Debugger
- [ ] Matcher Tester
- [ ] Simulator (spawn agents, run coordination scenarios)
- [ ] Ontology export / import

---

### Phase 8: AI Enhancements (Post-v1.0)
**Goal:** Proactive and Automatic AI modes.

- [ ] Tiptap GhostTextExtension (Proactive mode)
- [ ] Confidence scoring system (Automatic mode)
- [ ] A/B test: Reactive vs. Proactive vs. Automatic
- [ ] Gardener improvements (background semantic enrichment)

*Gate: >70% of users in user testing find Proactive mode helpful, not intrusive.*

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Detail blocks feel heavy | Medium | High | User test week 4, adjust visual weight |
| Matches feel irrelevant | Medium | High | 60% score threshold, show match explanation |
| Privacy model confusing | Low | Critical | Clear modal, factual neutral language |
| Agent tasks feel unsafe | Medium | High | Explicit activation, pause/cancel always visible |
| Network cold-start (no peers) | High | Medium | Local matching first; network = bonus |
| Mobile UX degraded | Medium | Medium | Mobile-first pass in Phase 6 |
| Ontology diverges across network | Medium | Medium | Ontology share/merge tooling in Phase 7 |
| Performance at 10k+ notes | Low | High | Benchmark suite, indexing, Bloom filters |

---

## Open Questions

| Question | Research Method | Phase |
|----------|-----------------|-------|
| Is "Detail" the right user-facing term? | A/B test | Phase 2 |
| Full-width blocks vs. inline chips? | User testing | Phase 2 |
| Collapse threshold: 5, 7, or 10 details? | User testing | Phase 2 |
| Should agent mode be per-note or global? | Design workshop | Phase 5 |
| Proactive AI: opt-in or opt-out? | A/B test | Phase 8 |
| What confidence threshold for auto-insert? | Data analysis | Phase 8 |
| Map view: embedding layout vs. manual? | Prototyping | Phase 7 |
| Should chat be persistent or ephemeral? | User research | Phase 4 |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Matching engine, parser, Nostr, data flow |
| [`README.md`](./README.md) | Project overview, getting started |
| [`TODO.md`](./TODO.md) | Backend / agent development roadmap |
| [`AGENTS.md`](./AGENTS.md) | Code standards, development guidelines |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | March 2026 | Initial specification |
| 1.1 | March 2026 | AI settings, terminology, density rules |
| 2.0 | March 2026 | Simplified to 4 concepts, implementation-ready |
| 2.1 | March 2026 | Detailed Phase 6 AI specification |
| 3.0 | March 2026 | Full revision: Agent tasks, Network/Map/Timeline views, Developer Mode, Ontology tools, Simulator, Chat, civilization-scale framing, expanded journeys, complete design system |

---

*Last Updated: March 2026*  
*Version: 3.0*  
*Status: Living Document — Implementation Guide*
