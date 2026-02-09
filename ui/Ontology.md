# Ontology & The Gardener

In Notention, the **Ontology** is the shared language of the network. Unlike traditional apps with fixed databases,
Notention's schema is **Emergent**.

## The Data Model

### Properties

Data is stored as `[key:operator:value]`.

- **Key:** The attribute name (e.g., `price`, `location`).
- **Operator:** Defines the relationship.
    - `is`: Fact (Real). "The price is 100".
    - `is not`: Fact (Real). "The status is not closed".
    - `<`, `>`, `contains`, `near`: Constraints (Imaginary). "I want price < 200".

### The Gardener

The Gardener is a background service (AI Agent) that observes note usage and creates **Attribute Definitions**.

1. **Observation:** User writes `[priority:is:High]` and `[priority:is:Low]`.
2. **Inference:** Gardener sees 5 occurrences. Infers `type: Enum` with options `['High', 'Low']`.
3. **Promotion:** The attribute `priority` is added to the local Ontology.
4. **Assistance:** The Editor now offers autocomplete for `priority`.

## Simulation & Evolution

To prevent a "Tower of Babel" scenario (everyone using different words for the same thing), we use **Simulation**.

- **SimulatorView:** (Developer Mode) Allows spawning agents with different vocabularies.
- **Matching Cycles:** Agents try to trade. If they fail (e.g., one uses `cost`, one uses `price`), the match score is
  low.
- **Convergence:** (Future) The Gardener will suggest aliases: "Did you mean `price`?" to align the network.

## Protocol Mapping (Nostr)

```json
[
  ["property", "price", "is", "100"],
  ["property", "currency", "is", "USD"]
]
```

This simple tagging scheme allows any Nostr client to parse and index semantic data without needing to understand the
full application state.
