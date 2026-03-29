# Notention Roadmap: The Sovereign Thought Computer

## Vision
Transform Notention from a private semantic notebook into a **Sovereign Thought Computer**. Notention bridges Thinking (Notes) and Doing via **VoltAgent**, its central intelligence. It starts as an ergonomic hybrid editor and scales into a P2P social mind where agents coordinate and evolve together, always remaining "Local-First" and under user sovereignty.

> **Mission:** Private by default, semantic by design. Universal matching. Skills as translators. Single-user utility first.

---

## Phase 1: Foundation & Ergonomics ("The Hybrid Mind")
**Goal:** From Empty State to "First Automation" in < 5 mins via a Hybrid Semantic Editor.

- [ ] **Hybrid Semantic Interface**:
    - Property Autocomplete: `[` triggers fuzzy search for ontology keys.
    - Natural Language Injection: "Ghost text" suggestions.
    - Live Validation: Visual feedback for ontology compliance.
- [ ] **Initial Setup Wizard**: Guide users from empty state to basic configuration (Notes = Instructions).
- [ ] **Self-Configuration Through Notes**: Enable notes to configure the system (e.g., `[@config:memory:enabled:true]`).
- [ ] **Ignition Dashboard**: Replace the blank list on startup with "Morning Brief" and "Focus for Today".

## Phase 2: The Action Loop ("The Hands")
**Goal:** Robust browser automation (VoltAgent) and a "Zero-Code" skill ecosystem.

- [ ] **VoltAgent Integration**:
    - Establish VoltAgent as the primary agentic backend.
    - Implement `Agent` abstraction layer.
- [ ] **Skill Ecosystem**:
    - **Skill Registry**: Map Semantic Patterns -> VoltAgent Skills.
    - **Standard Skills**: Indeed (Jobs), Craigslist (Marketplace), GitHub (Code).
    - **Recording Mode**: Generate skills from user actions ("Watch Me" -> "Ghost Mode").
- [ ] **Capability-Based Security**:
    - Skills must declare capabilities (e.g., `browser:navigate`).
    - Permission Notes: `[@allow:browser:navigate:indeed.com]`.
    - "Dead Man's Switch" for agent actions.

## Phase 3: Network & Simulation ("The Social Mind")
**Goal:** Multi-agent coordination and bioplausible simulation of idea propagation.

- [ ] **Resonance Protocol (Nostr)**:
    - Share Intent Hashes instead of raw notes.
    - Local matching of intents.
    - "Handshake" architecture for privacy.
- [ ] **Ontological Evolution**:
    - Track ontology changes across the network.
    - "Shadow Lexicon": Learn from user typing patterns locally (using local LLM).
- [ ] **Virtual Network Simulation**:
    - Simulate multi-user networks for testing.

## Phase 4: Ubiquitous Intelligence ("The Self")
**Goal:** The system runs everywhere, heals itself, and proactively helps the user.

- [ ] **Cross-Platform Sync**:
    - "Merkle Thought Tree" for sync without centralized servers.
    - Local-First sovereignty.
- [ ] **Adaptive Learning**: Continuous user behavior analysis and proactive suggestions.

---

## Immediate Tactical Plan (The "Fix My Life" Sprint)

### Week 1: Safety & State
- [ ] **Thought Wrapper**: Implement `Thought` interface wrapping `Note` with `sovereignty` field.
- [ ] **Gold Standard Toggle**: UI toggle for Manual / Assist / Auto modes.
- [ ] **Credential Migration**: Move credentials from Notes to OS Keychain.

### Week 2: The Ignition
- [ ] **"Fix My Life" Decomposer**: Rule-based decomposition of user intent ("Fix my life" -> 4 concrete thoughts).
- [ ] **Ignition Dashboard**: Build the dashboard UI.
- [ ] **Recording Mode**: Implement selector confidence scoring for skills.

### Week 3: The Shadow Lexicon
- [ ] **OntologyLearner**: Deploy in observation mode (local LLM).
- [ ] **Fuzzy Selector Healing**: Improve Playwright reliability.

### Week 4: Network Readiness
- [ ] **Resonance Protocol**: Implement hashed intents.
- [ ] **Nostr Testnet**: Test with virtual peers.

---

## Architecture Principles
1.  **VoltAgent-First**: Architecture optimized for VoltAgent's capabilities.
2.  **Ontology-Driven**: All functionality derives from the ontology.
3.  **Notes as Universal Interface**: Notes are the semantic expressions agents understand.
4.  **Privacy by Default**: All data private unless explicitly made public.
5.  **Local-First**: Sovereignty of data and computation.
