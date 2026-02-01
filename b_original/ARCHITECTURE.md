# Architecture & Design

## 1. Vision: The "Super App" for P2P Coordination
Notention acts as a generic interface for decentralized coordination. It replaces siloed apps (Upwork, Craigslist, Slack) with a unified **Semantic Network** where Intent (Demand) meets Capacity (Supply).

### Core Concepts
1.  **Semantic Notes:** Every piece of data is a "Note" augmented with `properties` (`[key:op:value]`).
2.  **Real vs. Imaginary:**
    *   **Real (`is`):** "I am a Web Developer" (Fact).
    *   **Imaginary (`<`, `contains`):** "I need a Web Developer" (Constraint).
3.  **Emergent Ontology:** The schema is not hardcoded. It evolves based on user usage ("The Gardener").

---

## 2. P2P Architecture (Nostr)
We use Nostr as the transport layer.
-   **Events:** Notes are Kind 1 events.
-   **Properties:** Semantic data is serialized as tags: `["property", "key", "operator", "value"]`.
-   **Discovery:** Users subscribe to relays. The app locally filters/matches notes based on semantic compatibility.

---

## 3. Semantic Engine ("The Physics")
Located in `utils/matching.ts` and `utils/parsing.ts`.

### Matching Logic
A "Match" occurs when a **Request Note** finds an **Offer Note** that satisfies its constraints.
-   **Request:** Treat all properties as Constraints.
-   **Offer:** Treat all properties (`is`) as Facts.
-   **Score:** `Matches / TotalConstraints`.

### Parsing
We support two formats:
1.  **Canonical:** `[key:op:value]` (e.g., `[price:is:100]`)
2.  **Symbolic:** `[key op value]` (e.g., `[price < 100]`)

---

## 4. User Roles & Progressive Disclosure

### Regular User
-   **UI:** Simple Note Editor.
-   **Experience:** Writes "natural" text. If they type `[budget < 500]`, the system quietly parses it.
-   **Goal:** Zero friction.

### Developer / Architect
-   **UI:** Developer Mode (Toggle in Settings).
-   **Features:**
    -   **Simulator:** A "Lab" to spawn agents and test ontology logic.
    -   **Ontology Graph:** View and prune the emergent schema.
-   **Goal:** Build and maintain the "Language" of the network.

---

## 5. Technical Implementation

### AI & The Gardener
-   **Service:** `services/gardener.ts`
-   **Providers:**
    -   `RemoteProvider`: Uses Gemini/OpenAI for high-quality inference.
    -   `LocalProvider`: Uses Regex/Heuristics for offline privacy.
-   **Workflow:** Scans notes -> Infers Types (Number/Date/Enum) -> Updates `settings.ontology`.

### Simulation
-   **Component:** `SimulatorView.tsx`
-   **Logic:** Spawns virtual `Agents` (e.g., "Freelancer", "Client") with pre-defined Note templates. Runs a "Cycle" to cross-match their notes and log results. This proves the system works without needing a live network.

### Data Flow
1.  **Edit:** User types -> `EditorManager` -> `parseProperties` -> `note.properties`.
2.  **Save:** `useDebouncedSave` -> `localforage`.
3.  **Publish:** `usePublish` -> Maps properties to Nostr Tags -> Sign & Send.
4.  **Network:** `NetworkView` -> Subscribes -> Filters/Matches locally.
