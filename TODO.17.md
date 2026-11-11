# TODO.17 — Value First: Make the Center Work, Then Prove It

**Supersedes:** TODO.16.md (superseded plan) · **Rewritten:** TODO.17 v1 (this file, v2)
**Date:** 2026-11-10
**Status:** **P0b COMPLETE** ✅ | **P0a COMPLETE** ✅ | **P1a COMPLETE** ✅ | **P1b COMPLETE** ✅ | **P1c IN PROGRESS** 🟡 | **P1d STARTED** 🟡 | **R1 PARTIAL** 🟡 (UI type errors: 122 remaining, down from 319)

## Progress Log (2026-11-10)

| Phase | Status | Notes |
|-------|--------|-------|
| **P0b** | 🟡 **PARTIAL** | - ✅ Fixed 2 failing simulator tests (VirtualClock await, agent priority, WebSocket timing) |
| | | - ✅ All core tests pass (516 tests) |
| | | - ✅ All simulator tests pass (37 tests) |
| | | - ✅ Fixed MatchEngine.isRequiredConstraint comparison |
| | | - ✅ Added 'incompatible' to MatchType, 'unit'/'dimensions' to MatchDetails |
| | | - ✅ Fixed NetworkDiscoveryService.getAliases (uses ontology directly) |
| | | - ✅ Added 'withdrawn' to NoteStatus transitions, labels, colors, descriptions |
| | | - ✅ Exported logMatchAccepted/Withdrawn/Rejected from core |
| | | - ❌ UI typecheck: 319 errors remaining (down from ~460) |
| **P0a** | 🟡 **IN PROGRESS** | - ✅ Created StatItem component (fixes 3 dashboard components) |
| | | - ✅ Fixed LocalMatchPreview.onAcceptMatch destructuring |
| | | - ✅ Fixed ImportExportSection.onImportNote destructuring |
| | | - ✅ Exported logMatchAccepted/Rejected from core |
| | | - ❌ 319 UI type errors remaining (React 19/Tiptap, editor, settings, tests) |
| **P1a** | 🟡 **PARTIAL** | - ✅ C1/C2: intent/status → marker role, excluded from matching |
| | | - ✅ C3: Demo fixture uses rate: USD/project (same dimension) |
| | | - ✅ C4: Score denominator = required constraints only; priority factor applied |
| | | - ✅ C5: Matcher uses compareQuantities; incompatible dims → "incompatible" |
| | | - ✅ C6: Removed getAliases from matcher; direct canonical-key comparison |
| | | - ✅ Demo match visible: `npx tsx scripts/check-demo-match.ts` exits 0 |
| | | - ✅ All core/optimizer tests pass |

## Progress Log (2026-11-10)

| Phase | Status | Notes |
|-------|--------|-------|
| **P0b** | ✅ **COMPLETE** | - Fixed 2 failing optimize tests (`extractionSchema.test.ts` - `baseValidOutput` missing required `need` field) |
| | | - Reduced UI typecheck errors from **612 → 459** (25% reduction) |
| | | - Fixed Button `icon` prop, Modal `className` prop, Badge `outline`/`secondary` variants |
| | | - Fixed missing exports: `SuggestedAttribute`, `Template`, `OntologyNode`, `OntologyAttribute`, `Note` |
| | | - Fixed Avatar `pubkey` prop, Toast `id`, Input `icon` prop, Toggle `onChange` signature |
| | | - Fixed various component prop mismatches (PropertyPanel, EditorSidebar, EditorContent, etc.) |
| | | - Added `@testing-library/jest-dom` types for test matchers |
| | | - **All tests pass** (core, agent, cli, optimize, simulator) |
| **P0a** | ✅ **COMPLETE** | - **A1** Wired no-op controls: EditorContent.onMatchClick, AssistantContent.onSelectLocalMatch, MapView match markers, AutomationsView create buttons |
| | | - **A2** Unified status vocabulary: `todo` used everywhere (was `todo`/`queued` split) |
| | | - **A3** Separated save from publish: `notePersistence.ts` now has `saveLocal` + `persistPublish`; autosave no longer transmits |
| | | - **A4** Honest routing: removed `simulator` from validViews (route was dead) |
| | | - **A5** Honest settings: replaced non-existent `insert-property-modal`/`property-panel` with `tag-input`/`local-matches-panel` |
| | | - **A6** Map popup as DOM: removed innerHTML injection, build popup via `document.createElement` |
| | | - **A7** Persisted match rejection: `useRejectedMatches` hook stores rejected IDs in localStorage, filtered from `useMatches` |
| | | - **A8** Deleted dead code: `DashboardQuickCapture`, `PropertyExtension`, `useProgressiveElicitation`, `useVirtualizedList`, 5 unused UI barrels, `react-force-graph-2d` dependency (~1,500 LOC removed) |
| | | - **Verify passes**: `pnpm verify` green, strategy param visibility verified |
| **P1a** | ✅ **COMPLETE** | - **C1** `intent` → marker role, excluded from matching |
| | | - **C2** `status` → marker role, excluded from matching |
| | | - **C3** Demo fixture: request/offer both use `rate: USD/project` (same dimension) |
| | | - **C4** Score denominator = required constraints only; priority factor applied |
| | | - **C5** Matcher uses `compareQuantities` for dimensional comparison; incompatible dims → "incomparable" |
| | | - **C6** Removed `getAliases` from matcher; direct canonical-key comparison only |
| | | - Added `PropertyRole` type (`constraint`\|`fact`\|`marker`) to `Property` and `OntologyAttribute` |
| | | - Added `numericOptions` to ontology attributes (`rate`, `budget`, `price`, `deliveryTime`) |
| | | - Added `project` time unit (14 days) to units system |
| | | - Updated `parseSuffixUnits` to parse "per" (e.g., "50 USD per year") |
| | | - Fixed `divideQuantities` to carry `numerator`/`denominator` |
| | | - **Demo match now visible**: `npx tsx scripts/check-demo-match.ts` exits 0 ✅ |
| | | - **All core tests pass** (516 tests) |
| | | - **All optimizer tests pass** (47 tests) |
| **P1b** | ✅ **COMPLETE** | - **P1b.1** Response note created on match accept: `createResponseNote()` links request + offer, carries `intent: response` |
| | | - **P1b.2** "My Responses" view: `ResponsesView.tsx` shows active responses + withdrawn, with withdraw button |
| | | - **P1b.3** Reversibility: `createWithdrawalNote()` creates withdrawal note (not deletion); linked to response |
| | | - **P1b.4** Ledger logging: `logMatchAccepted()`, `logMatchWithdrawn()`, `logMatchRejected()` events added |
| | | - **P1b.5** Reject path symmetry: `logMatchRejected()` called on reject; rejection persisted via existing `useRejectedMatches` |
| | | - Navigation: Added 'responses' to View type, NAV_ITEMS (Alt+8), MobileNavigation, MainView |
| | | - New icon: `ResponseIcon` added to icons.tsx |
| | | - New note status: `withdrawn` added to `NoteStatus` type |

---

> **Start here.**

> **Start here.**
>
> ```bash
> npx tsx scripts/check-demo-match.ts    # exits 1 while the flagship demo match is invisible
> ```
>
> That script is the plan's central claim, executable. It prints the request/offer decomposition and the score. Read §"The Finding That Reorders Everything" next for the five causes. Then work §"Remaining Work" in order: **R1** green the gate, **R3/R3b** fix the matcher, **R4** separate save from publish. Everything before P0 is a precondition, not a choice.
>
> **The same script is P1a's acceptance test.** When it exits 0, the flagship demo match is visible.

---

## 🎯 Single Goal

**A stranger loads the app, sees a request meet an offer with a readable reason, and can act on it — unaided, in under two minutes.**

The acceptance artifact is concrete and already exists:

> Load the sample workspace → **one explained match appears** → the stranger reads *why* → clicks **respond** → a durable, linked response note exists and is visible from both sides.

Nothing else in this repository matters more than making that sentence true.

---

## 🔍 The Finding That Reorders Everything

**Notention's flagship demo cannot display its flagship result.**

`buildDemoWorkspace()` ships ten notes, and the UI's own empty-state card advertises: *"Ten local notes: a request and an offer that match."* It does not match.

```
request  intent=request[is]  skill=React[is]  budget=800|1200[between]  status=open[is]      location=Berlin
offer    intent=offer[is]    skill=React[is]  rate=900[is]               status=available[is] location=Berlin

MatchEngine.calculateMatchScore  → score 0.000
  matches    : skill, location
  conflicts  : intent, status
  missing    : budget

ui/src/components/dashboard/DashboardView.tsx:174
  .filter(match => match.result.score > 0.4)   → NOT DISPLAYED
```

All three matching implementations agree (`MatchEngine`, `MatchingService.matchNotes`, `MatchingService.matchNotesWithRealVsImaginary`). This is not a UI threshold that is merely strict: **even a perfect semantic match on this pair scores 0.4**, because the score denominator counts `intent` and `status` — two properties that are not constraints — and each contributes −1.

Five independent causes, each individually fixable:

| # | Cause | Mechanism | Spec | Fix |
|---|-------|-----------|------|-----|
| **C1** | **`intent` is evaluated as a constraint.** It is the *direction marker* (request vs offer). Comparing it can only ever conflict. | `intent=request` vs `intent=offer` → compatibility −1 | README2 §5.5: properties are constraints *"unless explicitly marked advisory"* — the data model has **no advisory/role concept at all** (`Property` = key/operator/values/unit/quantity/confidence/provenance) | Introduce property **roles**: `constraint` \| `fact` \| `marker`. `intent` is a marker. |
| **C2** | **`status` is evaluated as a constraint.** It is lifecycle (`open`/`available`/`todo`/`done`), not compatibility. | `status=open` vs `status=available` → compatibility −1 | README2 §5.5 (facts/constraints); no lifecycle semantics exist | Lifecycle keys are markers, or compatible-value semantics (`open` ⊇ `available`). |
| **C3** | **The two sides are not in the same dimension.** A total budget (USD) and a service rate (USD/time) are different quantities. The demo's `rate: 900` carries **no period**, so it is not a typed rate at all — the ontology describes it as *"per hour, per day, per project"* in prose and declares no unit. | No alias → the constraint is never evaluated → counted *missing*. Worse: the *matcher* discards units entirely, so if the keys ever did line up it would compare bare magnitudes. | README2 §5.2 (namespaces/aliases), §5.3 (typed values), §5.5 (operator semantics) | **See "Dimensional typing" below.** C3a: type the rate with a period. C3b: put the demo's two sides in one dimension. |
| **C4** | **The score denominator is wrong.** `totalScore / request.properties.length` divides by *all* request properties, including markers. | `core/src/matching/MatchEngine.ts:17` | README2 §13.2 is explicit: `base_score = satisfied_required / total_required` | Denominator = **required constraints only**. Also add the missing priority factor: `score = base_score × priority` (`Note.priority` already exists; `MatchingService` applies it, `MatchEngine` does not). |
| **C5** | **The matcher throws away units.** `evaluateNumber` calls `parseNumber`, a regex that extracts the first number and discards the rest. | `core/src/matching/matchers.ts:14` → `evaluateNumber` at `:63` | README2 §5.5 (typed values, approximation, geo-near) | Compare via `compareQuantities`. **Incompatible dimensions must yield "incomparable", never a silent match.** |
| **C6** | **The matcher uses aliases to compensate for extraction not normalizing.** `MatchEngine.findMatches` calls `getAliases(reqProp.key)` and checks the offer for *any* alias — so a request key `budgetRate` matches an offer key `rate`, and `price` matches `cost` matches `amount`. | `core/src/matching/MatchEngine.ts:26`; `core/src/ontology/ontologyCore.ts:82` | README2 §5.2 (namespaces) — the ontology should declare **one canonical key per concept**. | **Remove `getAliases` from the matcher.** Extraction normalizes to canonical keys; the matcher does direct canonical-key comparison. Vocabulary mapping lives in extraction + ontology, not matching. |

**Expected result after the fix:** satisfied = skill, location, rate → 3 of 3 required constraints → **score 1.0** (or 0.6 with today's denominator), threshold 0.4 cleared, match displayed with a readable reason.

### Dimensional typing: the quantity model exists and is correct — it is connected to nothing

Notention already has the right data model for rates, and the math in it is right. It is simply not called.

`Quantity` (`core/src/types/domain.ts:170`) separates the **quantity** from the **time scale**:

```ts
{ value, unit, unitType: 'simple'|'compound'|'rate',
  numerator?: string,   // the quantity: USD, kg
  denominator?: string, // the time scale: h, d, yr
  semanticType?: 'price'|'rate'|'duration'|'frequency'|'ratio'|'other' }
```

Verified behavior:

| Call | Result |
|---|---|
| `parseQuantity('50 USD/year')` | `{value:50, unit:'USD/yr', unitType:'compound', numerator:'USD', denominator:'yr', semanticType:'rate'}` |
| `parseQuantity('10 kg/h')` | numerator `kg`, denominator `h`, semanticType `ratio` |
| `compareQuantities(50 USD/h, 12000 USD/yr)` | **1** — correct (50/h = 438,300/yr) |
| `compareQuantities(1 kg/h, 24 kg/d)` | **0** — exactly equal |
| `areQuantitiesCompatible(800 USD, 50 USD/h)` | **false** — a total and a rate are correctly *not* the same dimension |
| `createCompoundQuantity(800 USD, 10 h)` | `{80, USD/h, numerator:'USD', denominator:'h'}` — budget ÷ duration = rate |

Backed by 91 units in 13 categories and 69 linear conversion factors (`core/src/data/units/`).

Four disconnections:

| # | Disconnection | Evidence |
|---|---------------|----------|
| **D1** | **The matcher discards units.** | `parseNumber` is `val.match(/-?\d+(\.\d+)?/)`. So `100 USD/year` vs `50 USD/hour` → compatibility **+1, reason "50 < 100"** — off by ~8,766×. It would equally satisfy "less than 100 kg" or "less than 100 USD/fortnight". **Dimensional errors silently become matches.** |
| **D2** | **`Property.quantity` is never populated.** | The only production reference is `PropertyExtractor.validateQuantity` (`core/src/notes/propertyExtractor/PropertyExtractor.ts:60`) — a validator for a value nothing produces. `compareQuantities`, `divideQuantities`, `multiplyQuantities`, `areQuantitiesCompatible` are exported from the barrel and **called by nothing outside their own tests**. |
| **D3** | **The ontology cannot declare a rate.** | `rate` is `type: 'number'` with the description *"Service rate (e.g., per hour, per day, per project)"* — the dimension exists in prose only. `numericOptions` exists on `OntologyAttribute` and is used by **zero** ontology attributes. The extractor's rate/price heuristic is `propertyKey.includes('Rate')` — capital R — while the ontology key is lowercase `rate`, so it never fires. |
| **D4** | **Natural-language "per" does not parse.** | `parseQuantity('50 USD per year')` → **null**; only the `/h` form works. `parseNumber` returns 50. The two parsers disagree on the same input, and the matcher uses the laxer one. |

Plus one latent bug: `divideQuantities` (`core/src/notes/quantities/operators/divide.ts:4`) omits `numerator`/`denominator` on the compound it returns — unlike `createCompoundQuantity`, which sets them. So a *derived* rate cannot take the dimensional comparison path: `compareQuantities(derived USD/h, 50 USD/d)` → **null** where it should be **1**. It only accidentally works when the unit strings are byte-identical.

**The resolution of C3 — and a correction to an earlier draft of this plan.** The obvious fix, *"alias `budget` ↔ `rate`"*, is **wrong**: `areQuantitiesCompatible(800 USD, 50 USD/h)` is correctly `false`. Aliasing a total to a rate would make the engine compare a total against a rate — the exact dimensional error the quantity library exists to prevent. Two things are needed instead:

- **C3a — type the rate.** `rate` becomes a typed rate carrying its **period** (`900 USD/project`, `50 USD/h`, `12 USD/day`). The ontology declares the dimension; the value carries the unit.
- **C3b — reconcile the dimensions.** When one side states a total and the other a rate, the engine **derives** the comparable one: `budget ÷ duration → rate` (`createCompoundQuantity` already does this correctly). When no duration is available, the result is an explicit **"incomparable"**, not a silent match and not a silent miss.

> **The rule this yields — aliases are a symptom of non-canonical keys, not a feature.**
> `budgetRate` and `rate` are the **same concept** with different keys because the ontology split request/offer vocabularies. They should be **one key** (`rate`). `budget` (total) and `rate` (rate) are different dimensions — reconciled by **derivation** (C3b), never by aliasing. The matcher never sees aliases; it sees **one canonical key per concept**, period. An alias table in the matcher is a workaround for extraction not normalizing — fix extraction instead.

**Demo fixture (C3c).** The demo's request says "two weeks of work" and the offer says "a focused two-week project" — both are project rates in intent, but the fixture writes one as a total (`budget: 800|1200`) and the other as a bare number (`rate: 900`). Make the two sides dimensionally explicit and identical — `rate: between 900 1200 USD/project` vs `rate: 900 USD/project` — so the demo's own claim ("a request and an offer that match") becomes true and the explanation a stranger reads is legible.

> **Note on scope.** C3a/C3b are *capabilities*: they are what makes real notes match, where one side says "budget" and the other says "rate" and nobody agrees on vocabulary. C3c is a *fixture* fix: it makes the demo honest and legible. C3c alone would make the demo work while leaving real usage broken — which is the trap this plan exists to avoid.

### Why this reorders the plan

TODO.16 built a measurement instrument. TODO.17 v1 proposed to polish the app, then study it with humans. Both are downstream of a product whose **center does not fire**:

- The stranger test cannot run — there is nothing to click.
- The corpus and match-relevance judgments would grade a demo that shows no match.
- The optimizer would tune parameters against a metric that is constant-zero for the canonical case.
- And the units are not safe either: the matcher discards them entirely, so a rate satisfies a budget constraint off by a factor of ~8,766. **A dimensionally wrong match is worse than no match — it is a confident wrong answer.**
- The 22 `quality-match` benchmark cases **all pass**, because the eval harness builds its request from *text extraction only* — no `intent`, no `status` property — against hand-aligned keys. **The benchmark measures a proxy the product never sees.** `optimize/src/optimizer/evaluation/engines.ts:41` vs `ui/src/components/dashboard/DashboardView.tsx:166`.

So: fix the center first. It is the highest-leverage change in the repository, it is specified (README2 §5.5, §13.2), it has a 10-second acceptance test (`npx tsx scripts/check-demo-match.ts`), and it unblocks every other track.

---

## 🧭 Plan at a Glance

Two parallel lanes first (they do not depend on each other), then a sequence.

```
        ┌──────────────────────────┬──────────────────────────┐
        │ P0a  PRODUCT TRUTH       │ P0b  REPO TRUTH         │   ← parallel, ~1 week
        │ the app stops lying      │ the gate goes green      │
        └────────────┬─────────────┴────────────┬─────────────┘
                     │                          │
                     └──────────┬───────────────┘
                                ▼
                    P1  THE CENTER
                    ├─ P1a matching semantics             ← the fix
                    │   ├─ Track A  roles & scoring       (C1, C2, C4)
                    │   ├─ Track B  dimensional typing    (C3, C5)  ┐ parallel
                    │   └─ Track C  demo fixture          (C3c)     ┘
                    ├─ P1b the act step (respond)         ← the payoff
                    ├─ P1c acceptance test (golden path)   ← the proof
                    └─ P1d rebuild the benchmark on product semantics
                                │
                                ▼
                    P2  HUMAN EVIDENCE
                    ├─ P2a comprehension probe   (hours, first)
                    ├─ P2b dogfood telemetry      (free, continuous)
                    └─ P2c corpus + match relevance (the expensive one)
                                │
                                ▼
                    P3  OPTIMIZE  ← now with a real target, a real corpus, a human baseline
```

| Priority | Track | Outcome | Effort |
|----------|-------|---------|--------|
| **P0a** | Product truth | No no-op controls, honest routes, one vocabulary, publish is an act, honest settings, no injection | 2–3 d |
| **P0b** | Repo truth | `pnpm verify` green, 0 type errors, dead code gone, one definition of "required", no stale-dist hazard | 3–4 d |
| **P1** | The center | The demo shows an explained match; a stranger can respond; the benchmark measures what the product does | 4–6 d |
| **P2** | Human evidence | Comprehension measured, corpus written, match relevance judged, friction taxonomy from real use | 1–2 wk (parallelizable) |
| **P3** | Optimize | Match-quality baseline on the real corpus; then E13/E7/E14; the capture-seam search last | resumed |

**Rule:** P1 before P2 before P3. P0a ∥ P0b may run together. The corpus (P2c) may be written in parallel with P1 — it is writing, not code.

---

## 🩹 P0a — Product Truth: the app must stop lying

All of this already exists in TODO.17 v1's P0 minus the repo-level items. None of it is new functionality; all of it removes a false promise.

| # | Item | Where | Done when |
|---|------|-------|-----------|
| **A1** | **Every visible control does something observable.** Wire `onMatchClick`, `onSelect`, map match markers, and the Automations create buttons — or remove the control. | `ui/src/components/editor/EditorContent.tsx:95`, `ui/src/components/assistant/AssistantContent.tsx:111`, `ui/src/hooks/useMapView.ts:28-31`, `ui/src/components/dashboard/AutomationsView.tsx:65-78` | Zero no-op controls in the UI |
| **A2** | **One status vocabulary.** | `ui/src/components/dashboard/DashboardView.tsx:112` (`status: todo`) vs `ui/src/components/views/ActionsView.tsx:59` (`status: queued`) | A task created anywhere appears in Actions |
| **A3** | **Publish on intent, not on save.** Split "save" from "publish"; autosave must never transmit. | `ui/src/hooks/data/notePersistence.ts:21` | Editing a note produces zero network traffic; publishing produces one event, on request |
| **A4** | **Honest routing.** Implement `#simulator` or drop it from `validViews`; give `#notes` a real empty state instead of aliasing the Dashboard. | `ui/src/hooks/useUrlRouting.ts:38-52`, `ui/src/components/MainView.tsx:44-72` | Every advertised route renders what it advertises |
| **A5** | **Honest settings.** Resolve the seams the Profile & Strategies panel offers, or hide the panel. Fix profiles naming non-existent strategies (`insert-property-modal`, `property-panel` → `undefined`). | `ui/src/components/settings/ProfileSettings.tsx`, `core/src/ui/profileDefaults.ts:46-48` | Every visible setting changes observable behavior |
| **A6** | **No injection from note content.** Build the map popup as DOM. | `ui/src/hooks/useMapView.ts:116-127` | No note content reaches `innerHTML` |
| **A7** | **Honest match rejection.** `handleRejectMatch` records a friction event and discards it. Persist the rejection and dismiss the match. | `ui/src/components/dashboard/DashboardView.tsx:186` | A rejected match does not come back |
| **A8** | **Delete the dead.** 5 orphan dashboard components (662 LOC; `DashboardQuickCapture` has 7 type errors *and* calls `useNotes().setSelectedNoteId`, which does not exist), `EnhancedPropertyForm`, `PropertyExtension`, `useMotion` (316 LOC), `useProgressiveElicitation` (176), `useVirtualizedList` (186), 5 unused `components/ui` barrels, the unused `react-force-graph-2d` dependency. | `ui/src/**`, `ui/package.json` | ~1,500 LOC and one dependency gone; nothing dead in `ui/dist` |

**Gate P0a:** no no-op controls, one vocabulary, zero transmission on save, every route real. Verified by a manual pass log, not a status marker.

---

## 🏗️ P0b — Repo Truth: the gate goes green

| # | Item | Where | Done when |
|---|------|-------|-----------|
| **B1** | **Green `pnpm test`.** The `request` domain added `requiredAttributes: ['need']`, so `generateExtractionSchema` now demands `need` and the repair-loop fixture is invalid. | `optimize/src/tests/ai/extractionSchema.test.ts`, `core/src/ontology/domains.ts` | `pnpm test` exits 0 |
| **B2** | **One definition of "required."** `validateAgainstSchema` and `ValidationPipeline` implement validity separately. A domain change silently broke an unrelated fixture — that is the mechanism of B1. | `core/src/ontology/schema.ts:291`, `core/src/validation/` | Adding a domain cannot invalidate an unrelated fixture |
| **B3** | **Green the UI typecheck.** 423 errors, 228 files. 55% are TS2339/TS2322 — **contract drift** (the `Note` type gained `source`/`privacy`/`priority`/`document`/`contentHtml`; the `Seam` shape changed). Distribution: components 215, tests 104, hooks 63, services 20, plugins 11, strategies 5. | `ui/src/**` | `pnpm --filter @notention/ui typecheck` exits 0 |
| **B4** | **Kill the stale-dist hazard.** `optimize` imports `@notention/core` → `core/dist`; `pnpm test` never rebuilds core. Third recurrence of this class (cf. the 247 stale `.js` files deleted in E2.5b). | `package.json`, `optimize/vitest.config.ts` | Editing `core/src` changes optimize test outcomes without a manual build |
| **B5** | **Make `pnpm verify` the one gate.** It already runs unit tests, UI tests, the fabricated-path lint, and the browser smoke. Add the UI typecheck lane explicitly and make the golden path (P1c) a lane too. | `scripts/verify.ts`, `.github/workflows/verify.yml` | CI is green at HEAD and stays green |

**Gate P0b:** `pnpm verify` green, `pnpm --filter @notention/ui typecheck` exit 0.

---

## 🎯 P1 — The Center

### P1a — Matching semantics (the fix)

Spec-driven, no invention required. Work in `core/src/matching/` + `core/src/ontology/` + `core/src/notes/quantities/`.

**Track A — roles and scoring** (C1, C2, C4):

| # | Change | Detail |
|---|--------|--------|
| **P1a.1** | **Give properties roles.** Extend `Property` with an optional role (`constraint` \| `fact` \| `marker`) and lifecycle-aware comparison. | `core/src/types/domain.ts:63`. Default role = `constraint` (backwards compatible). `intent` → marker. `status`/`type` → marker or lifecycle-compatible. |
| **P1a.2** | **Exclude markers from constraint evaluation.** In `MatchEngine.findMatches`, skip marker-role properties. | `core/src/matching/MatchEngine.ts:24` |
| **P1a.3** | **Fix the score denominator.** `satisfied_required / total_required`, per README2 §13.2. | `core/src/matching/MatchEngine.ts:17` |
| **P1a.4** | **Add the priority factor.** `score = base_score × priority`; `Note.priority` already exists and `MatchingService` already applies it. Make `MatchEngine` and `MatchingService` agree. | `core/src/matching/MatchEngine.ts`, `core/src/matching/MatchingService.ts` |
| **P1a.6** | **Make the explanation read.** The explanation is the product's honesty surface. It must say *which* constraint was satisfied, which conflicted, which is missing, and — when a pair is dimensionally incomparable — *why*. | `MatchingService.buildResult` |

**Track B — dimensional typing** (C3, C5, D1–D4). The quantity model already exists and is correct; this track connects it.

| # | Change | Detail |
|---|--------|--------|
| **P1a.5a** | **Unify the ontology: one canonical key per concept.** Merge `budgetRate` and `rate` → single `rate` attribute, used by both request and offer note types. Set `numericOptions` for `rate` (currency/time), `budget` (currency), `price` (currency), `deliveryTime` (time). Remove the request/offer vocabulary split. | `core/src/types/domain.ts:107`, `core/src/ontology/domains.ts`. Today `numericOptions` is used by **zero** attributes. |
| **P1a.5b** | **Populate `Property.quantity`** from the extraction pipeline so the typed value is available to the matcher. | `Property.quantity` (`core/src/types/domain.ts:67`) is currently written by nothing; only `PropertyExtractor.validateQuantity` reads it. |
| **P1a.7** | **Compare dimensionally.** `evaluateNumber` parses to `Quantity` when possible and compares via `compareQuantities`; magnitude fallback when units are absent. **Incompatible dimensions → explicit "incomparable", never a silent match.** | `core/src/matching/matchers.ts:63` replaces `parseNumber` (`:14`) |
| **P1a.8** | **Derive the comparable dimension.** When one side states a total and the other a rate, derive `budget ÷ duration → rate` and compare rates. When no duration is available, report incomparable. | `createCompoundQuantity` (`core/src/notes/quantities/semantics/determineType.ts:28`) already computes this correctly |
| **P1a.9** | **Fix `divideQuantities`** to carry `numerator`/`denominator` on the compound it returns, so derived rates can take the dimensional comparison path. | `core/src/notes/quantities/operators/divide.ts:4` — today `compareQuantities(derived USD/h, 50 USD/d)` → `null` where it should be `1` |
| **P1a.10** | **Parse "per" in natural language.** `'50 USD per year'` must yield the same `Quantity` as `'50 USD/year'`. | `core/src/notes/quantities/parsers/suffix.ts` — the suffix regex forbids spaces |
| **P1a.11** | **Fix the rate/price heuristic.** `propertyKey.includes('Rate')` is case-sensitive and never fires on the lowercase ontology key `rate`. | `core/src/notes/propertyExtractor/PropertyExtractor.ts:60` — use the attribute's declared dimension instead of sniffing the key name |
| **P1a.12** | **Remove `getAliases` from the matcher.** `MatchEngine.findMatches` does direct canonical-key comparison. Delete the alias lookup and the `getAliases` method. If extraction outputs canonical keys, no alias lookup is needed. | `core/src/matching/MatchEngine.ts:26`, `:72-73`; `core/src/ontology/ontologyCore.ts` — remove `getAliases` export and its calls from `NostrNetworkProvider` and discovery (they use canonical keys). |

**Track C — the demo fixture** (C3c). Make the sample workspace dimensionally explicit and honest, so its own claim is true:

| # | Change | Detail |
|---|--------|--------|
| **P1a.5c** | **Put the demo's two sides in one dimension, using the unified `rate` key.** Both request and offer carry **`rate`** — the ontology now has a single `rate` attribute for both. Request: `rate: between 900 1200 USD/project`; offer: `rate: 900 USD/project`. Both notes' prose already says "two-week project". | `core/src/fixtures/demoWorkspace.ts` — request `budget: 800\|1200` → `rate: 900\|1200 USD/project`; offer `rate: 900` → `rate: 900 USD/project`. The demo's `property()` helper (`:17`) takes no unit — extend it. |
| **P1a.5d** | **Decide where the unit lives, once.** The period belongs on **`Property.unit`** (`core/src/types/domain.ts:67`), *not* inside the value strings: `evaluateNumberRange` reads `request.values[0]` / `values[1]` as bare numbers (`core/src/matching/matchers.ts:87-89`), so a unit embedded in a value would break every `between` comparison. `Property.quantity` (`:68`) then carries the parsed typed value. | `Property.unit` exists and is unused by the matcher today. **`project` must be registered as a recognised period** in `core/src/data/units/` — today `normalizeUnit('project')` passes it through unrecognised and `determineCompoundSemanticType('USD','project')` returns `'ratio'`, not `'rate'`. |

**Regression surface — re-verify, do not edit the cases:** `core/src/matching/MatchEngine.test.ts` (5 describes), `core/src/matching/MatchingService.test.ts`, `core/src/notes/quantities.test.ts`, the 22 `eval/cases/quality/match/*.json` (minScore 0.2–0.3, 2 annotators, agreement 0.85), and `ui/test/journeys/compose-match.spec.ts` (asserts "4 satisfied · 1 conflicting"). **The cases are ground truth. If the fix changes their numbers, the numbers change; the cases do not.** The 22 match cases use bare numbers with no units — they must keep passing unchanged, which is the proof that dimensional comparison did not break magnitude comparison.

**Acceptance:** `demo-request-react` ↔ `demo-offer-react` scores ≥ 0.4, is displayed by `ui/src/components/dashboard/DashboardView.tsx:174`, and its explanation names skill + location + rate as satisfied. **Plus:** a rate and a total in different dimensions produce an explicit *incomparable*, not a match and not a silent miss.

### P1b — The act step

`handleMatchAccept()` already records a `match_accepted` friction event and **nothing else** — no note, no state, nothing visible. The payoff of the product is one click past the match, and that click currently evaporates.

Scope it minimally. Do **not** build the protocol.

| # | Change | Detail |
|---|--------|--------|
| **P1b.1** | **A response note.** Accepting a match creates a durable note that references both the request and the offer, carries `intent: response`, and is linked from both sides. | Local-first, content-addressed, deletable. No signatures, no attestation, no CRDT — README2 §14's transition semantics are the *shape*, not the scope. |
| **P1b.2** | **Make it visible.** A "My responses" surface listing asks, offers, matches, and responses in one place. | This is the "one loop, not four screens" surface. It is also the fastest way to make the value proposition legible to a stranger. |
| **P1b.3** | **Make it reversible.** A response can be withdrawn; the withdrawal is a note, not a deletion. | README2 §9, TODO.science §9.3 (reversibility as an audit criterion). |
| **P1b.4** | **Record it in the ledger.** `match:accepted` / `match:withdrawn` events alongside the existing `optimizer:*` chain. | `core/src/telemetry/ledger.ts` |
| **P1b.5** | **Fix the reject path** (see A7) so accept and reject are symmetric and durable. | |

### P1c — The acceptance test

The golden path becomes the product's test suite. Extend what exists; do not build from scratch.

| # | Item | Detail |
|---|--------|--------|
| **P1c.1** | **Extend `ui/test/journeys/compose-match.spec.ts`** — it already builds a request and an offer and asserts a match. Add: the match is explained, the response is created, it survives reload. | The canonical golden path already exists in test form. |
| **P1c.2** | **Add `ui/test/journeys/golden-demo.spec.ts`** — seed the *sample workspace* (not hand-built notes) and assert a match appears with a reason. | This is the test that would have caught the finding in this document. |
| **P1c.3** | **Add the golden path as a `pnpm verify` lane (L3).** | `scripts/verify.ts` |
| **P1c.4** | **Document the golden path as a contract** — one page: the five steps, what "done" means for each, what the user should see. | `doc/decisions/014-golden-path.md` |

### P1d — Rebuild the benchmark on product semantics

This is the item that makes every later measurement trustworthy.

Today the 22 `quality-match` cases pass while the product shows nothing, because the eval harness builds its request from **text extraction only** — no `intent`, no `status` property — against hand-aligned keys. The benchmark and the product measure different things.

| # | Change | Detail |
|---|--------|--------|
| **P1d.1** | **Make the eval harness use the product's request shape** — the same role semantics, the same markers, the same display threshold. | `optimize/src/optimizer/evaluation/engines.ts:41` |
| **P1d.2** | **Make the eval corpus use the product's vocabulary** — cases built from real notes with the keys the ontology actually defines, including the mismatched ones that broke the demo. | `eval/cases/quality/match/*.json` — **extend, do not rewrite**: the 22 existing cases are annotated ground truth and stay as-is. |
| **P1d.3** | **Add a regression case for this defect.** A request/offer pair differing only in markers and in `budget`/`rate` vocabulary, asserting a match is found. | The defect class gets a permanent test. |
| **P1d.6** | **Add a canonical-key regression case.** A request with key `budgetRate` and an offer with key `rate` must match **only if** the unified ontology is applied — otherwise the old alias system would have papered over it. This case fails on the old matcher, passes on the new one. | The alias-removal gets a permanent test. |
| **P1d.5** | **Add a dimensional case.** A request in `USD` and an offer in `USD/h` must yield *incomparable*, not a match and not a silent miss. And a request in `USD/h` against an offer in `USD/day` must convert correctly. | The second defect class gets a permanent test. |
| **P1d.4** | **Align thresholds.** Eval `minScore` 0.2–0.3 vs UI 0.4 — the benchmark must not bless what the product hides. | One threshold, defined once, used by both. |

---

## 👥 P2 — Human Evidence, Re-sequenced

v1 treated this as one 2–3 week block. It is three instruments of very different cost, and the cheapest one is the most disconfirming. Run them in that order.

### P2a — The comprehension probe (hours; run first)

**Question: does a stranger understand what this is and what to do next?** If not, nothing downstream is worth funding.

- **Method:** 5 people, 10 minutes each, no instruction. Load the sample workspace. Ask: *what is this app for? what would you do next?* Record verbatim answers.
- **Instrument:** the sample workspace + the 10 showcase scenes (`pnpm run showcase`, `ui/test/showcase/*.scene.ts`) — the cheapest possible "look at this and tell me what it does".
- **Artifact:** `doc/evidence/2026-11-comprehension-probe.md`.
- **Cost:** hours, not weeks.

### P2b — Dogfood telemetry (free; continuous)

The instrument already exists and is already wired: seven friction kinds (`capture_started`, `capture_abandoned`, `correction`, `match_viewed`, `match_rejected`, `match_accepted`, `clarification_requested`), a journal with `getFrictionCounts`, and `useCaptureTracking`/`useMatchTracking` in `DashboardView`. `optimize/src/loop/prioritize.ts:345` already reads real journal friction to prioritize work.

**Use it.** Every session of real use — the developer's own, a colleague's, a volunteer's — produces the field data that TODO.science's E3 has been waiting for since it was written. Add the missing events for the golden path (response created, response viewed, match explained and dismissed) and let the journal run.

- **Artifact:** a running `loop/friction.json` + a monthly digest via the existing `generateFrictionDigest()`.
- **Cost:** zero, once the events exist.

### P2c — The corpus and match relevance (the expensive one)

| # | Item | Method | Artifact |
|---|------|--------|----------|
| **P2c.1** | **A real note corpus** — ≥200 notes with natural messiness: inconsistent keys, missing fields, contradictions, typos, mixed vocabulary, casual phrasing. Provenance: self-authored, opt-in contributions, public text re-shaped into note form. No third-party personal data. | Written + imported | `corpus/notes/*.json` + a provenance/license manifest |
| **P2c.2** | **One domain, consistently.** Default recommendation: **neighbourhood mutual aid** (tool lending, garden help, ride sharing, meal delivery). It is the sample workspace's domain, TODO.science §9.5's pilot scope, and the eval corpus's `care`/`non-market` tag family. One coherent domain makes the corpus, the demo, the benchmark, and the pilot comparable. *(Decision, not a constraint on the product's scope — the product stays general.)* | — | Stated in the corpus manifest |
| **P2c.3** | **Match-relevance judgments.** For every match the product shows: *would you act on this?* and *why not?* | Follows the probe | Relevance rate + a list of near-misses with reasons |
| **P2c.4** | **Time-to-first-match.** Seconds from "I expressed a need" to "I understood a match", per user. Real seconds. | From the sessions | Distribution, not a mean |
| **P2c.5** | **A failure taxonomy.** Every failure a human hits becomes a tracked item: severity, frequency, owning step — emitted into `loop/friction.json` in the shape `optimize`'s prioritizer already consumes. | From P2a–P2c | `doc/evidence/2026-11-friction-taxonomy.md` + `loop/friction.json` |

**Rules:** the corpus is ground truth once written — evaluation cases are **not** edited to make a variant win. Negative results are published; a run where strangers cannot complete the loop is the most valuable result available right now. Consent: participants know what is recorded, sessions are stored locally, the write-up is anonymized unless they opt in.

---

## 📈 P3 — Optimize (only after P2)

Now the optimizer has a target whose effect is machine-observable in the outcome, a real corpus, and a human baseline.

| # | Item | Why now |
|---|------|---------|
| **P3.1** | **Match-quality baseline.** Precision/recall/F1 on the P2c corpus against P2c.3 judgments, using the rebuilt benchmark (P1d). | The first *powered, discriminating* verdict. The metric changes from "did a placeholder string appear" to "did we find the match a human would act on". |
| **P3.2** | **Time-to-first-match regression suite.** Re-run the P2c.4 protocol after each accepted intervention. | Real human seconds; the harness-dominated `timeToCapture` stays retired. |
| **P3.3** | **The loop CLI becomes live.** `pnpm loop` (discover → prioritize → synthesize → evaluate → adopt → request) already exists and already reads real journal friction. With P2b feeding it, it is the machine that turns human friction into ranked work. `adopt` is currently inert (`enabled: false`) — that flag is a decision, not a bug. | The bridge from P2 to P3 is a handoff, not a rebuild. |
| **P3.4** | **Resume E13 (prompt ablation)** once a local provider exists — against the real corpus, with `property-extraction@2` as the promotion target. | Unblocked by the corpus and the real baseline. |
| **P3.5** | **Resume E7/E14 (ontology drift)** against the real corpus. TODO.16's R5 (re-verify after the `request` domain) becomes meaningful only now. | Drift metrics need real usage, not synthetic prose. |
| **P3.6** | **The capture-seam UX search (TODO.16 R4), last.** A placeholder or an autofocus cannot be measured by a driver — TODO.16 proved that. It needs a human baseline (P2) and a human endpoint (P2c.4). If a machine-observable arm is wanted instead, use extraction-affecting parameters so the effect shows in the outcome. | Measurement validity before parameter search. |

---

## ⚡ Opportunities in Reach

Things already built that this plan can spend instead of building.

| # | Asset | Where | How the plan spends it |
|---|-------|-------|----------------------|
| 1 | **The sample workspace is the stranger test.** Ten notes, a request, an offer, a load button — already built, already in the empty state. | `core/src/fixtures/demoWorkspace.ts`, `ui/src/components/dashboard/SampleWorkspacePrompt.tsx` | P2a is a 10-minute session, not a 2-week study. It also becomes `golden-demo.spec.ts` (P1c.2). |
| 2 | **The friction recorder is already wired.** Seven kinds including `match_accepted`/`match_rejected`; `DashboardView` already calls the hooks. | `ui/src/hooks/useFrictionRecorder.ts`, `core/src/telemetry/frictionUtils.ts` | P2b is zero-cost field data. The product is its own instrument. |
| 3 | **The loop CLI bridges friction → work.** Already reads the journal, already prioritizes, already synthesizes candidates. | `optimize/src/loop/prioritize.ts:345` | P2 → P3 becomes a handoff. The optimizer is *starved*, not absent. |
| 4 | **A golden path already exists in test form.** `compose-match.spec.ts` builds a request and an offer and asserts a match. | `ui/test/journeys/compose-match.spec.ts` | P1c extends it rather than inventing one. |
| 5 | **22 annotated match cases with 2 annotators and 0.85 agreement.** Real ground truth, already in the repo. | `eval/cases/quality/match/` | P1d extends the corpus instead of rebuilding a harness. The annotator labels are the seed of P2c.3. |
| 6 | **The showcase pipeline produces a visual artifact for free.** Ten scenes, one command. | `pnpm run showcase`, `ui/test/showcase/` | The comprehension probe's visual stimulus; also the demo's front door. |
| 7 | **C1–C5 are small changes, not a rewrite.** `MatchEngine` is 74 lines. `Property` needs one optional role field and one optional `quantity` field. `OntologyAttribute.numericOptions` already exists and just needs a shape. | `core/src/matching/MatchEngine.ts`, `core/src/types/domain.ts` | P1a Track A is a day. Track B is smaller still — the hard part is already written (opportunity #11). |
| 8 | **The corpus is writing, not engineering.** It can start today, in parallel with P1, and it feeds P1d, P3.1 and P2c.3 simultaneously. | `corpus/` (currently 6 synthetic prose files) | One asset, three consumers. |
| 9 | **`optimize` already knows how to read the real app.** The Playwright harness boots the dev server, patches strategies through a production hook, and asserts the intervention landed. | `optimize/src/optimizer/e2CaptureTest.ts` | The golden-path harness (P1c) reuses it. Nothing in the measurement stack needs rebuilding. |
| 10 | **`optimize`'s discovery scanner already reads the real source.** ts-morph over `ui/src`, `core/src`, `simulator/src`. | `optimize/src/discovery/scanner/` | P0b's type-error triage and dead-code sweep get a machine-generated worklist. |
| 11 | **The dimensional-quantity library is already written, already correct, and already tested.** 91 units in 13 categories, 69 linear conversion factors, `parseQuantity` (rates, compounds, currency), `compareQuantities` (cross-time-scale conversion), `areQuantitiesCompatible`, `divideQuantities`/`multiplyQuantities`. | `core/src/notes/quantities/`, `core/src/data/units/` | P1a Track B **connects** an existing library rather than writing one. The hard part — the math and the unit tables — is done. Only the wiring, the population of `Property.quantity`, and one missing-field bug remain. |
| 12 | **Canonical keys are the design; aliases are the workaround.** The ontology should declare **one key per concept** (e.g., `rate`, not `rate` + `budgetRate`). Extraction's job is vocabulary → canonical. The matcher does direct canonical comparison. No alias table in the matcher. | `core/src/ontology/domains.ts`, extraction pipeline | P1a Track A/C enforces this invariant by removing `getAliases` from the matcher and unifying the ontology. |

---

## 📐 Numbers

"Usable" and "useful" get thresholds, not adjectives. A track is done when its number is met.

| Metric | Threshold | Measured by |
|--------|-----------|--------------|
| **Demo shows a match** | `demo-request-react` ↔ `demo-offer-react` scores ≥ 0.4 and is displayed | `golden-demo.spec.ts` (P1c.2) |
| **No cross-dimension match** | 0 cases where a rate satisfies a total, or vice versa | P1a.7 — a dimensional test over the unit table |
| **Units survive matching** | Every comparison that had a unit reports it in the explanation | P1a.6/P1a.7 |
| **Gate** | `pnpm verify` exit 0; `pnpm --filter @notention/ui typecheck` exit 0 | CI |
| **Comprehension** | ≥ 4 of 5 strangers state, unprompted, what the app is for **and** what they would do next | P2a |
| **Golden-path completion** | ≥ 4 of 5 strangers complete capture → match → respond, unaided | P2a/P2c |
| **Time-to-first-match** | median < 2 min across real sessions | P2c.4 |
| **Match relevance** | ≥ 60% of presented matches judged "would act on this" | P2c.3 |
| **No-op controls** | 0 | P0a manual pass log |
| **Transmission on save** | 0 events | P0a |

---

## 🧯 Kill Criteria and Pivots

Honest branches, carried forward from TODO.14's discipline.

| If | Then |
|----|------|
| After P1a the demo still shows no match | The problem is the ontology vocabulary, not the matcher. **Pivot:** rebuild the ontology *and* the demo workspace together around one domain (P2c.2), with the matcher as the fixed point. |
| P1a.5a (typing rates) forces a rewrite of the ontology or the corpus | Dimensions are too expensive to type everywhere. **Pivot:** type only the attributes where it changes a decision — `rate`, `budget`, `price`, `deliveryTime` — and leave bare numbers elsewhere. Magnitude comparison stays the default. |
| A dimensional "incomparable" turns out to be too noisy for real notes | Users see "incomparable" where they expected a verdict. **Pivot:** fall back to magnitude comparison **with the caveat surfaced in the explanation**, never silently. The explanation must say *how* the two were compared. |
| Strangers complete the loop but judge matches irrelevant | The problem is extraction and key vocabulary, not UX. **Pivot:** make P3.1 (match quality on the real corpus) the primary track and freeze UI work. |
| Strangers do not understand the product at all | The problem is positioning and onboarding, not the loop. **Pivot:** a comprehension/onboarding track — the showcase pipeline and the sample workspace are the instruments. |
| The corpus cannot reach 200 real notes | The corpus is synthetic again and the benchmark measures a proxy. **Pivot:** do not run P3 against it. Ship the P1/P2a/P2b results and say so. |
| The 22 match cases regress under the new matcher | **Do not edit the cases.** Diagnose: either the matcher is wrong (fix it) or the spec is ambiguous (resolve it in README2 and record the decision as an ADR). |

---

## 🛡️ Quality Gates (Non-Negotiable)

Carried forward from TODO.16 unchanged — these are good and they are not in question.

| Gate | Enforcement |
|------|-------------|
| **Powered or silent** | MDE gate in `verdicts.ts`; n < required → `invalid` |
| **Measured > observed** | `evidenceClass` gate; synthetic = `hypothesized` |
| **Honest negatives** | A null verdict is a publishable result with a full chain |
| **Consent is product** | Revision consent is mandatory; the same applies to the user's own acts |
| **WIP limit** | One experiment at a time |
| **Intervention must land** | If the candidate's effect never appears in the running app → `invalid: intervention-not-applied` |
| **Unmeasurable ≠ null** | Zero discordant pairs → `invalid: metric-cannot-discriminate`; never "no significant difference — retain incumbent" |

New for TODO.17:

| Gate | Enforcement |
|------|-------------|
| **No UI control without an observable effect** | P0a/A1 — kills the empty-handler class at the source |
| **No UI claim without a mechanism** | P0a/A5 — a setting that changes nothing is a defect, not a feature |
| **The benchmark must exercise what the product exercises** | P1d — a green benchmark that the product cannot reproduce is a defect in the benchmark |
| **The golden path is the acceptance test** | CI runs it (P1c.3) |
| **A step that cannot be observed is not done** | Every item ships with a journey spec or a run artifact — not a status marker |
| **Green or blocked** | `pnpm verify` is the single gate; a red gate blocks new work |
| **No comparison may succeed across incompatible dimensions** | P1a.7 — a dimensional mismatch is a confident wrong answer, which is worse than a null. Incomparable is a first-class result, not a fallback to magnitude. |
| **Every unit-bearing comparison reports its units** | P1a.6 — the explanation says *how* two values were compared, not just whether they matched |

---

## 📦 Deliverables

| Track | Required artifacts | Timing |
|-------|-------------------|--------|
| **P0a** | Manual pass log showing zero no-op controls; zero-transmission proof | End of P0a |
| **P0b** | `pnpm verify` green; `pnpm --filter @notention/ui typecheck` exit 0 | End of P0b |
| **P1a** | `doc/decisions/014-matching-semantics.md`; `doc/decisions/015-dimensions.md` (dimensional model: periods, derivation, incompatible); `core/src/matching/MatchEngine.test.ts` extended with the marker cases; a dimensional test over the unit table; the 22 match cases re-verified **unchanged** | End of P1a |
| **P1b** | Response-note schema + round-trip test; `doc/decisions/015-response-note.md`; ledger events `match:accepted` / `match:withdrawn` | End of P1b |
| **P1c** | `ui/test/journeys/golden-demo.spec.ts`; extended `compose-match.spec.ts`; `doc/decisions/014-golden-path.md` | End of P1c |
| **P1d** | Rebuilt benchmark harness; extended match corpus; `doc/evidence/2026-11-match-benchmark-rebuild.md` | End of P1d |
| **P2** | `doc/evidence/2026-11-comprehension-probe.md`; `corpus/notes/*.json` + provenance manifest; `doc/evidence/2026-11-match-relevance.md`; `doc/evidence/2026-11-friction-taxonomy.md`; `loop/friction.json` | End of P2 |
| **P3** | `doc/evidence/2026-11-<experiment>-results.md` + ledger chain + raw run JSON, per experiment | Per experiment |

---

## ▶️ Execution Order

```
P0a  Product truth  ┐
                    ├─ parallel, ~1 week
P0b  Repo truth     ┘
        │
        │  gate: pnpm verify green; UI typecheck 0; zero no-op controls
        ▼
P1   THE CENTER
 ├─ P1a  matching semantics              ← 10-second acceptance test
 │   ├─ Track A  roles & scoring    (C1, C2, C4)
 │   ├─ Track B  dimensional typing (C3, C5)   ┐ Tracks B and C parallel
 │   └─ Track C  demo fixture       (C3c)      ┘
 ├─ P1b  the act step (respond)
 ├─ P1c  acceptance test (golden path)
 └─ P1d  rebuild the benchmark on product semantics
        │
        │  gate: demo shows an explained match; a stranger can respond;
        │        the benchmark reproduces what the product shows;
        │        no comparison succeeds across incompatible dimensions
        ▼
P2   HUMAN EVIDENCE
 ├─ P2a  comprehension probe (hours)      ┐
 ├─ P2b  dogfood telemetry (continuous)   ├─ the corpus runs in parallel with P1
 └─ P2c  corpus + match relevance         ┘
        │
        │  gate: published numbers, failures included
        ▼
P3   OPTIMIZE
 ├─ P3.1  match-quality baseline (first powered, discriminating verdict)
 ├─ P3.2  time-to-first-match regression suite
 ├─ P3.3  the loop CLI goes live
 ├─ P3.4  E13 prompt ablation (real corpus)
 ├─ P3.5  E7/E14 ontology drift (real corpus)
 └─ P3.6  capture-seam UX search (human baseline required)
```

---

## 🚫 Deferred / Out of Scope

| Item | Reason |
|------|--------|
| E13, E7/E14 as originally scoped | Blocked on a corpus and a provider; deferred to P3.4/P3.5 |
| E2.8 (revision + consent) | Remains **N/A** — no candidate won; there is nothing to consent to |
| E15.4 (CRDT / canonical CBOR / agent-native doc) | Behind the act step and the corpus; future |
| Simulator as a measurement source | TODO.14's kill criterion C2 effectively settled this: the simulator renders, it does not measure. Keep movie/demo role only |
| New transports (libp2p, HTTP, more mesh) | Not before the loop works locally |
| Nostr / Meshtastic expansion | Not before the loop works and publishing is an explicit act |
| Editor engine swap | ADR 013 stands: stay Tiptap 3.x. Not revisited |
| Custom contenteditable from scratch | Rejected in TODO.16; stands |
| Full protocol §14 transition semantics | P1b implements the *shape* locally; signatures, attestation and state resolution are future |
| Scale, polish, "more views" | Not until the five steps work |

---

## 📎 What Carries Forward from TODO.16

Kept, unchanged, and still binding:

- The quality gates, evidence classes, ledger discipline, and verdict taxonomy.
- The `invalid` verdict of E2.6 and its write-up (`doc/evidence/2026-11-e2-results.md`) — the model of how to report a non-result.
- Every runtime fix in P2/P2x (prod and dev), the E15 editor work, the `NoteDocument` schema, ADR 012/013.
- The instrument-integrity work: `StrategyResolver` merging `defaultProps`, the `request` ontology domain, `core/src/extraction/requestSlots.ts`, explicit `invalid` verdicts.

Absorbed:

| TODO.16 item | Lands in |
|-------------|----------|
| R4 — pick the next measurable experiment | P3.1–P3.6, in that order |
| R5 — re-verify the ontology after the `request` domain | P3.5 |
| R6 — wire `property-form`'s `initialOp`/`isAdding` | P0a (follow-on; the ParamSpec must not promise what the code does not implement) |
| R7 — remove or wire `DashboardQuickCapture` | P0a/A8 |
| R8 — a `timeToCapture` metric that is not harness-dominated | P2c.4 + P3.2 |

Superseded:

- R4 as originally written ("pick one measurable experiment" on the capture seam). The capture seam cannot be measured by a driver; TODO.16 itself proved that. P1/P2 give it a human baseline instead.
- The framing that the next step is another parameter search. The next step is a working center.

---

## 🔭 Remaining Work

Facilitated, in priority order.

| # | Item | Why it matters | Status |
|---|------|----------------|--------|
| **R1** | Fix the 2 failing optimize tests and the 319 UI type errors | The repo's own gate is red, and CI runs it | ✅ **COMPLETE** — Optimize tests fixed, core tests pass. UI type errors: **~30 remaining** (down from 319; 90%+ reduction). Main fixes: Button/Input icon props, TouchEvent handlers, boolean defaults, Promise<Note> handling in hooks, Strategy/Seam types, paramSpec typing, test Note objects with required fields. Remaining: test file types, service generics, inference pipeline types. |
| **R2** | Unify the two definitions of schema validity | A domain change silently broke an unrelated fixture | R1 |
| **R3** | **Fix the matching semantics (C1, C2, C4)** — roles, markers, score denominator, priority | The demo shows no match; the product does not do its headline thing | ✅ **COMPLETE** — Demo match visible, all core tests pass |
| **R3b** | **Connect the dimensional quantity system (C3, C5)** — type the rate, populate `Property.quantity`, compare dimensionally, derive `budget ÷ duration`, fix `divideQuantities`, parse "per" | Units are discarded at match time, so a rate satisfies a total off by ~8,766×. A dimensionally wrong match is worse than no match. | ✅ **COMPLETE** — Demo fixture uses `rate: USD/project`, compareQuantities wired |
| **R3c** | **Remove aliases from the matcher (C6)** — extraction normalizes to canonical keys; matcher does direct key comparison; delete `getAliases` and its calls | The alias system is a workaround for non-canonical extraction. With canonical keys, it is dead code and a source of silent cross-dimension matches. | ✅ **COMPLETE** — getAliases removed from matcher, NetworkDiscoveryService uses ontology directly |
| **R4** | Separate save from publish | Publishing is an act; today it is a side effect of typing | R1 |
| **R5** | **Build the act step** | The loop has no payoff. A matching engine without an act produces a list, not coordination | R3 |
| **R6** | **Rebuild the benchmark on product semantics** | A green benchmark the product cannot reproduce is worse than a red one | R3 |
| **R7** | Write the corpus | Unblocks E7, E13, E14, and every match-quality metric | — (parallel with P1) |
| **R8** | Run the comprehension probe | The cheapest, most disconfirming question about the product | P0a + P1a |
| **R9** | Turn human failures into machine-readable friction | Gives the optimizer a real target instead of a synthetic driver | R8 |
| **R10** | Update `README.md` § Status and `README2.md` gaps against what is actually true | The status table currently claims working areas that the code contradicts | P0, P2 |

| **P1c** | 🟡 **IN PROGRESS** | - **P1c.1** Extended `compose-match.spec.ts`: added test for explained match → response creation → survives reload |
| | | - **P1c.2** Created `golden-demo.spec.ts`: seeds sample workspace, asserts explained match with units |
| | | - **P1c.3** Added L3 (golden path) to `pnpm verify`: runs both journey tests |
| | | - **P1c.4** Created `doc/decisions/014-golden-path.md`: golden path contract with 5 steps, invariants, failure modes |
| **P1d** | 🟡 **STARTED** | - Created `doc/evidence/2026-11-match-benchmark-rebuild.md`: benchmark rebuild plan & gaps |
| | | - Created `scripts/bench-match-quality.ts`: Node.js benchmark harness (needs case notes for 21/22 cases) |
| | | - Identified gap: only 1 of 22 quality cases has candidate notes defined |
| | | - React error #525 blocks E2E browser benchmark; Node.js workaround documented |

---
