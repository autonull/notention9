# Notention Development Roadmap

> **Mission**: Build a universal semantic coordination system where intent (demand) meets capacity (supply) through local-first P2P matching. Notention is the "language" of coordination—semantic by design, private by default, extensible by nature.

> **📖 See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for file references, code patterns, and step-by-step instructions.**


## Strategic Priorities

This roadmap focuses on **core semantic infrastructure** and **P2P coordination** as the foundation. All other features—tools, skills, automation—extend this base but are not the essence.

**What Notention Is:**
- **Semantic Network**: Notes with properties enable universal matching logic
- **P2P Coordination Layer**: Nostr as transport, semantics as protocol  
- **Local-First Sovereignty**: Your data, your ontology, your rules
- **Extensible Platform**: Tools and skills compose on semantic primitives

**What Notention Is NOT:**
- A collection of web scrapers (Indeed, Craigslist are examples, not the point)
- Yet another task manager (emergent from semantics, not prescribed)
- A centralized platform (P2P is not a feature, it's the architecture)

---

## Phase 1: Semantic Engine - The Foundation
**Goal**: Perfect the matching logic, property system, and ontology that power coordination

### 1.1 Advanced Matching Engine
**Why**: Matching is the killer feature. It must be fast, accurate, and handle complex constraints.

- [ ] Enhanced matching algorithm:
  - **Constraint satisfaction**: Support `<, >, <=, >=, is, contains, excludes`
  - **Partial matching**: Score by % of constraints satisfied
  - **Weighted constraints**: Some properties more important than others
  - **Type coercion**: Auto-convert "100" (string) to 100 (number) for comparison
  - **Range matching**: `[budget: 100-500]` matches `[price:is:300]`
- [ ] Performance optimization:
  - Index notes by property keys for O(log n) lookup
  - Bloom filters for quick "impossible match" rejection
  - Incremental matching: Only recompute when notes change
  - Target: <100ms for 1000 notes, <500ms for 10,000 notes
- [ ] Match quality scoring:
  - Confidence score: `matchedConstraints / totalConstraints`
  - Relevance ranking: Boost exact matches, penalize partial
  - Explain score: "Matched 4/5 constraints. Missing: location"
- [ ] **Verification**:
  - [ ] Write `core/tests/matching.test.ts`:
    - Test all operators with various types
    - Test partial matching scoring
    - Test performance with 1k, 10k notes
  - [ ] Manual: Create request + offer notes in UI, verify correct matches shown

**Impact**: "Matching is instant, accurate, and explainable. The core value prop works flawlessly."

---

### 1.2 Property System Enhancement
**Why**: Properties are the semantic primitives. They must be ergonomic and powerful.

- [ ] Property parsing improvements:
  - Support both `[key:op:value]` and `[key op value]`
  - Multi-value: `[skills:is:react,typescript,node]`
  - Nested: `[location.city:is:Austin]`
  - Aliases: `loc` → `location`, `$` → `price`
  - Units: `[price:is:100 USD]`, `[distance:is:5 km]`
- [ ] Property validation:
  - Type checking: Ensure `[age:is:thirty]` errors (should be number)
  - Range constraints: `[price:is:150]` valid only within bounds
  - Required properties: "Requests must have at least 1 constraint"
  - Suggested corrections: "Did you mean [role:is:engineer]?" (fuzzy match)
- [ ] Property composition:
  - Macros: `@freelancer` expands to `[role:is:freelancer][available:is:true]`
  - Templates: "Job Posting" pre-fills common properties
  - Inheritance: Sub-properties inherit parent constraints
- [ ] **Verification**:
  - [ ] Write `core/tests/properties.test.ts`:
    - Parse all formats, verify correct AST
    - Test validation rules, macro expansion
  - [ ] Integration: Type properties in UI, verify live validation

**Impact**: "Writing semantic notes feels like writing prose. The system guides you."

---

### 1.3 Ontology Evolution & Visualization
**Why**: Static schemas don't scale. The ontology must learn and adapt.

- [ ] Ontology learning:
  - Track property key usage frequency
  - Infer types from values: `[age:is:25]` → `age: number`
  - Suggest new keys: "You've typed 'remote' 10 times. Add to ontology?"
  - Detect schema drift: "Warning: `location` now has 5 formats. Consolidate?"
- [ ] Ontology visualization (Developer Mode):
  - Interactive network graph: Keys as nodes, co-occurrence as edges
  - Filter by category, frequency, recency
  - Search: "Show me all location-related keys"
  - Prune: Mark keys as deprecated, merge synonyms
- [ ] Ontology sharing (P2P):
  - Export ontology as JSON: `{keys: [...], types: {...}, aliases: {...}}`
  - Import from peers: "Alice has 50 job-related keys. Merge?"
  - Convergence detection: "90% of network uses these 20 core keys"
- [ ] **Verification**:
  - [ ] Write `core/tests/ontology.test.ts`:
    - Add notes, verify keys learned
    - Test type inference, export/import cycle
  - [ ] Manual: Create 20 notes, check ontology graph shows patterns

**Impact**: "The ontology grows smarter. Cross-network compatibility emerges organically."

---

## Phase 2: P2P Coordination - The Network Effect
**Goal**: Enable decentralized matching via Nostr with privacy, efficiency, and semantic alignment

### 2.1 Nostr Publishing & Discovery
**Why**: Publishing is easy. Semantic discovery needs intelligence to find real matches without spam.

- [ ] Enhanced Nostr integration:
  - **Semantic event kinds**: Define custom kind for semantic notes (e.g., Kind 35000)
  - **Property tags**: Map note properties to Nostr tags for filtering
  - **Privacy layers**: 
    - Public: Full note content + properties
    - Hashed: Only property keys + hashed values (for privacy-preserving matching)
    - Encrypted: DM-style for direct exchanges after match
- [ ] Smart relay selection:
  - Auto-select relays based on topic/geography
  - Relay performance monitoring (latency, availability)
  - Fallback and redundancy (publish to 3+ relays)
  - User-configurable relay list
- [ ] Subscription filters:
  - Subscribe to relevant property keys only (not entire firehose)
  - Tag-based filters: `{kinds: [35000], '#role': ['freelancer']}`
  - Rate limiting: Don't overwhelm client with 1000s of notes/sec
- [ ] **Verification**:
  - [ ] Set up local Nostr relay (nostream/strfry) for testing
  - [ ] Write `verification/verify_nostr_publishing.ts`:
    - Publish note, verify appears on relay
    - Subscribe with filter, verify only matching notes received
    - Test privacy modes (public, hashed, encrypted)
  - [ ] Manual: Two instances, publish/subscribe, verify match notification

**Impact**: "Your notes coordinate globally while preserving privacy and avoiding spam."

---

### 2.2 Privacy-Preserving Matching
**Why**: P2P matching reveals intent. Need cryptographic primitives to protect privacy.

- [ ] Hash-based intent broadcasting:
  - Publish property keys + hashed values instead of plaintext
  - Remote nodes can check "does my value hash match?" without revealing
  - Bloom filter optimization for quick rejection
- [ ] Threshold encryption for matches:
  - When hash match detected, initiate encrypted handshake
  - Both parties reveal plaintext only after mutual consent
  - No central authority needed
- [ ] Reputation & trust layer:
  - Track successful matches (signed receipts)
  - Reputation score: # of successful trades/connections
  - Trust network: Vouch for peers, transitive trust
- [ ] **Verification**:
  - [ ] Write `verification/verify_p2p_privacy.ts`:
    - Publish hashed intent, verify plaintext not leaked
    - Simulate match, verify handshake protocol
    - Test reputation scoring
  - [ ] Manual: Use Wireshark to verify no plaintext leaks

**Impact**: "Coordination without surveillance. Your constraints stay private until you choose to reveal."

---

### 2.3 Multi-Instance Coordination Tests
**Why**: Simulations are synthetic. Need real multi-instance P2P testing.

- [ ] Distributed test harness:
  - Docker Compose: Spin up N instances + local Nostr relay
  - Each instance: Agent server + CLI client + Nostr integration
  - Shared relay for deterministic testing
- [ ] P2P coordination scenarios:
  - **Marketplace**: 5 buyers, 5 sellers, verify all matches found in <10s
  - **Task delegation**: 1 requester, 3 workers, verify work split correctly
  - **Resource sharing**: 10 neighbors, verify needs matched to offers
- [ ] Network effects analysis:
  - Match rate vs. network size (N=5, 10, 20, 50, 100)
  - Ontology convergence: Do schemas align over time?
  - Performance: Latency from publish → match discovery
- [ ] **Verification**:
  - [ ] Write `verification/verify_distributed_coordination.ts`
  - [ ] Run on CI with Docker Compose orchestration
  - [ ] Generate report: graphs, metrics, pass/fail thresholds

**Impact**: "We have proof the P2P coordination works at realistic scale before public launch."

---

## Phase 3: Tool Architecture - Extensibility
**Goal**: Build clean, extensible tool infrastructure that serves semantic/P2P needs

### 3.1 MCP Tool Registry Refactoring
**Why**: Current boilerplate blocks innovation. Streamline tool creation.

- [ ] Create `McpToolRegistry` class:
  - Centralized tool registration with error handling
  - Auto-generate schemas for documentation
  - Tool metadata: category, capabilities, examples
- [ ] Create `McpTransportManager`:
  - Reusable SSE/session lifecycle management
  - Eliminate 25+ lines of duplication
  - Session metrics and graceful shutdown
- [ ] **Verification**:
  - [ ] Existing test: `npx tsx verification/verify_cli_mcp.ts` still passes
  - [ ] Manual: Start server, connect CLI, verify both endpoints work

**DX Impact**: "New tools: 30 lines → 5 lines. Faster iteration."

---

### 3.2 Plugin System
**Why**: Community extensions without forking core.

- [ ] Design `ToolPlugin` interface:
  - Lifecycle: `initialize(config)`, `getTools()`, `cleanup()`
  - Manifest: name, version, dependencies, capabilities
- [ ] `McpPluginManager` for dynamic loading:
  - Load from `agent/plugins/` directory
  - npm package support
  - Hot reload for development
- [ ] Reference plugins (lightweight examples):
  - `WebhookPlugin`: Trigger notes from HTTP webhooks
  - `exportPlugin`: Export notes to JSON/CSV/Markdown
  - `CalDAVPlugin`: Sync calendar events (demonstrates external format)
- [ ] **Verification**:
  - [ ] Write `verification/verify_plugins.ts`:
    - Load/unload plugin, verify tools appear/disappear
    - Execute plugin tool, validate output
    - Test hot reload

**UX Impact**: "Install capabilities like browser extensions."

---

### 3.3 Configuration Management
**Why**: Scattered config sources create onboarding friction.

- [ ] `ConfigManager` with hierarchical merging:
  - Priority: CLI args > env > `~/.notentionrc` > defaults
  - Type-safe (Zod schemas)
  - Config profiles (dev, prod, demo)
- [ ] CLI commands:
  - `/config show`, `/config set <key> <value>`, `/config profile <name>`
- [ ] **Verification**:
  - [ ] Write `verification/verify_config.ts`:
    - Test precedence, persistence, restart

**DX Impact**: "Onboarding: Edit 3 files → Run `/config set`"

---

## Phase 4: Intelligence Layer - LLM for Semantics
**Goal**: Leverage LLMs to enhance semantic understanding, not replace human intent

### 4.1 Semantic Understanding Tools
**Why**: LLMs excel at extracting structure from natural language.

- [ ] Note analysis tools (MCP):
  - `analyze_note(id)`: Extract entities, intent, suggested properties
  - `suggest_properties(content)`: Infer semantic properties from prose
  - `find_similar(note)`: Semantic similarity search (embeddings)
- [ ] Ontology assistance:
  - Auto-suggest new keys from usage patterns
  - Detect schema drift, suggest migrations
  - Generate validation rules from examples
- [ ] Agent-assisted authoring:
  - Inline suggestions: "This looks like a task. Add `[status:is:todo]`?"
  - Template expansion: "Freelancer" → auto-properties
  - Constraint checking: Warn if request has impossible constraints
- [ ] **Verification**:
  - [ ] Write `verification/verify_semantic_understanding.ts`:
    - Natural language → properties extraction
    - Similarity search accuracy
    - Ontology suggestions from patterns

**UX Impact**: "Writing notes feels like pair programming with the semantic engine."

---

### 4.2 CLI UX with LLM Streaming
**Why**: CLI is functional but austere. Add modern LLM interaction.

- [ ] Streaming UX:
  - Real-time token display with markdown rendering
  - Tool call indicators: `🔧 Calling analyze_note...` → `✅ Analysis complete`
  - Progress bars for long operations
- [ ] Parallel tool execution:
  - Execute independent tools concurrently
  - Dependency graph resolution
  - Timeout and cancellation
- [ ] Context management:
  - Auto-summarization when approaching token limits
  - Sliding window with semantic compression
  - Pin important messages (system prompts, preferences)
- [ ] **Verification**:
  - [ ] Write `verification/verify_llm_streaming.ts`:
    - Long query → verify streaming
    - Parallel tools → verify concurrency
    - Context limit → verify summarization

**UX Impact**: "CLI feels alive. Interactive, not batch."

---

### 4.3 Enhanced Command System
**Why**: Make CLI discoverable and extensible.

- [ ] Improved `/tools` command:
  - Category organization (Semantic, P2P, Files, Network)
  - Search: `/tools search match`
  - Info: `/tools info find_similar` shows schema + example
- [ ] Command registry (extensible):
  - Plugins can register custom slash commands
  - Auto-generated help, aliases
  - Tab completion support
- [ ] Interactive wizards:
  - `/create note` - Guided note creation with property suggestions
  - `/publish` - Guide through P2P publishing with privacy options
- [ ] **Verification**:
  - [ ] Manual walkthrough video
  - [ ] User testing: 3 new users, collect feedback

**Impact**: "CLI is discoverable. No docs needed for basics."

---

## Phase 5: Testing & Verification Infrastructure
**Goal**: Comprehensive testing ensures quality before launch

### 5.1 Multi-Agent Simulation Framework
**Why**: Verify coordination patterns with realistic agent behaviors.

- [ ] Simulation scenario DSL:
  ```typescript
  scenario('Gig Economy', {
    agents: [
      { role: 'freelancer', count: 5, properties: {...} },
      { role: 'client', count: 3, properties: {...} }
    ],
    events: [
      { at: 0, action: 'clients_post_jobs' },
      { at: 5, action: 'freelancers_search' },
      { at: 10, action: 'verify_matches', expect: { min: 3 } }
    ]
  })
  ```
- [ ] Agent behavior profiles:
  - Rational (best match), Random (exploration), Realistic (probabilistic)
- [ ] Metrics:
  - Match rate, response latency, ontology convergence
- [ ] **Verification**:
  - [ ] Refactor existing `verify_cli_mcp.ts` to use DSL
  - [ ] Add scenarios from `use-cases.md`
  - [ ] Run with 10, 50, 100 agents, measure scaling

**Impact**: "Proven coordination patterns before production."

---

### 5.2 End-to-End Integration Tests
**Why**: Unit tests miss integration bugs.

- [ ] Browser automation (Playwright):
  - `test_ui_semantic_authoring.ts`: Type → parse → save → reload
  - `test_ui_p2p_publish.ts`: Publish → verify on relay
  - `test_ui_match_discovery.ts`: Two browsers, local relay, verify match
- [ ] CLI + MCP integration:
  - `test_cli_plugin_lifecycle.ts`: Install → use → uninstall
  - `test_cli_config_persistence.ts`: Update → restart → verify
- [ ] Cross-component flows:
  - `test_note_to_p2p_flow.ts`: Create in UI → publish via CLI → discover in second UI
- [ ] **Verification**:
  - [ ] Run `npm run test:integration`
  - [ ] CI/CD pipeline on every commit
  - [ ] Aim for 80%+ coverage on critical paths

**DX Impact**: "Refactor with confidence. Regressions caught immediately."

---

### 5.3 Performance Benchmarking
**Why**: Prevent performance degradation as system grows.

- [ ] Benchmark suite:
  - Note CRUD (1, 100, 1000 notes)
  - Semantic matching complexity
  - Tool execution latency
  - P2P relay round-trip time
- [ ] Continuous benchmarking:
  - Store results in `benchmarks/history.json`
  - Alert if metrics regress >10%
- [ ] Optimization targets:
  - Note save: <50ms
  - Match 1000 notes: <100ms
  - P2P match discovery: <2s
- [ ] **Verification**:
  - [ ] Write `verification/benchmark_performance.ts`
  - [ ] Run weekly, commit results

**Impact**: "System stays fast at scale."

---

## Phase 6: Optional Advanced Features
**Goal**: Nice-to-haves that extend the platform but aren't core

### 6.1 Silo Skills (Optional)
**Why**: Useful for demos but not the mission. Build only if time permits.

- [ ] Skill ecosystem (lower priority):
  - Indeed job scraper (browser automation)
  - Craigslist marketplace scraper
  - GitHub issue sync
- [ ] Skill-LLM bridge:
  - Dynamic skill composition
  - Learning from demonstrations
- [ ] **Note**: These are **examples**, not the product. Focus on semantic/P2P first.

---

### 6.2 Proactive Agent Behaviors (Optional)
**Why**: Cool but requires maturity in Phases 1-5.

- [ ] Background monitoring:
  - Watch for patterns, suggest automations
- [ ] Scheduled workflows:
  - Cron-like: `[when:every Monday, action:search]`
- [ ] Multi-step planning:
  - LLM generates action plans
  - Execution with error handling

---

### 6.3 Advanced UI Polish (Optional)
**Why**: Nice but not critical for V1.

- [ ] Skill execution feedback (live progress, VoltAgent view)
- [ ] Multi-modal support (images, voice)
- [ ] Advanced developer mode features

---

## Success Metrics

### Phase 1: Semantic Engine ✅
- Matching: <100ms for 1000 notes
- Property parsing: 100% coverage of spec
- Ontology: Successfully learns from 100+ notes

### Phase 2: P2P Coordination ✅
- 10+ instances coordinate successfully
- Match discovery: <2s end-to-end
- Zero privacy leaks in tests
- Ontology converges across network

### Phase 3: Tool Architecture ✅
- Plugin system: 3+ community plugins published
- Tool creation: 30 lines → 5 lines
- Configuration: Single command setup

### Phase 4: Intelligence ✅
- Semantic understanding: >90% accuracy on property extraction
- LLM streaming: Smooth, responsive in CLI
- Command discovery: Users find features without docs

### Phase 5: Testing ✅
- Integration tests: 80%+ coverage
- Simulations: 100 agents, 90%+ match rate
- Performance: All benchmarks within targets

### Phase 6: Optional ✅
- Nice-to-haves based on bandwidth

---

## Implementation Strategy

### Ordering
1. **Semantic First** (Phase 1): Foundation before everything
2. **P2P Second** (Phase 2): Core value prop proven early
3. **Tools Third** (Phase 3): Infrastructure to support extensions
4. **Intelligence Fourth** (Phase 4): LLM enhances what's already working
5. **Test Throughout** (Phase 5): Built incrementally alongside features
6. **Advanced Last** (Phase 6): Only if time permits

### Parallel Workstreams
- **Semantic + P2P** (1-2 people): Phases 1-2 are core, deserve focus
- **Infrastructure** (1 person): Phase 3 enables community
- **Intelligence** (1 person): Phase 4 enhances UX
- **Testing** (ongoing): Phase 5 runs parallel to all phases

### Milestones
- **M1 (Week 6)**: Phase 1 complete, semantic engine excellent
- **M2 (Week 12)**: Phase 2 complete, P2P coordination proven
- **M3 (Week 16)**: Phase 3 complete, plugin ecosystem ready
- **M4 (Week 20)**: Phase 4 complete, LLM-enhanced experience
- **M5 (Week 24)**: Phase 5 complete, comprehensive test coverage
- **M6 (Week 28)**: Phase 6 if time, polish and launch

---

## Next Steps

**Immediate (This Week)**:
1. ✅ Review roadmap with team
2. Start Phase 1.1: Enhanced matching algorithm
3. Set up project board with Phase 1-2 tasks
4. Assign workstreams

**Short-term (Month 1)**:
- Complete Phase 1 (semantic engine)
- Start Phase 2.1 (Nostr integration)
- Begin building Phase 5 test infrastructure

**Long-term**:
- Phases 1-2 by Month 3 (core proven)
- Phases 3-4 by Month 5 (extensible + intelligent)
- Phase 5 by Month 6 (well-tested)
- Launch with proven P2P coordination

---

## Open Questions for Review

1. **Nostr Relay Strategy**: Self-host recommended relays? Partner with existing? Both?
2. **Privacy Trade-offs**: How much to reveal for discoverability vs. privacy?
3. **Ontology Convergence**: Enforce standard keys or let emerge naturally?
4. **LLM Provider**: Vercel AI SDK sufficient? Add Anthropic native support?
5. **Mobile Strategy**: PWA priority or defer to V2?

---

*This roadmap prioritizes semantic matching and P2P coordination as the core mission. Skills and automation are optional extensions that demonstrate the platform but are not its essence.*
