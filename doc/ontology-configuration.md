# Notention Ontology Configuration System

The new pluggable, data-driven ontology system (introduced in Week 7) replaces the legacy TypeScript-based definitions with JSON modules that can be loaded, extended, and configured at runtime. This document covers how to use and customize the system.

## Overview

The ontology is now composed of **modules** — JSON files that define types and nodes — loaded in priority order via a configuration file. Each module can:
- Define new types (with operator vocabularies, constraints, extraction hints)
- Define new nodes (entities, events, etc.) with attributes that inherit from types
- Extend existing types/nodes from earlier modules

**Key principles:**
- **Type-inherited operators (RDFS/OWL-style):** Types own their operator vocabularies. Attributes inherit operators from their type; they only override to *narrow*.
- **Config-driven selection:** System capabilities are determined by which modules are loaded (via feature flags).
- **Zero redundant declarations:** ~100+ per-attribute `operators` blocks eliminated — types are the single source of truth.

---

## 1. Configuration File

The system reads an ontology configuration file (default: `ontology/config.default.json`):

```json
{
  "version": "1.0.0",
  "modules": [
    { "name": "core-types", "path": "core/types.json", "priority": 10 },
    { "name": "core-entity", "path": "core/entity.json", "priority": 20 },
    { "name": "core-communication", "path": "core/communication.json", "priority": 20 },
    { "name": "core-event", "path": "core/event.json", "priority": 20 },
    { "name": "core-work", "path": "core/work.json", "priority": 20 },
    { "name": "core-commerce", "path": "core/commerce.json", "priority": 20 },
    { "name": "survival-types", "path": "survival/types.json", "priority": 30 },
    { "name": "survival-hazard", "path": "survival/hazard.json", "priority": 40 },
    { "name": "survival-resource", "path": "survival/resource.json", "priority": 40 },
    { "name": "survival-shelter", "path": "survival/shelter.json", "priority": 40 },
    { "name": "survival-medical", "path": "survival/medical.json", "priority": 40 },
    { "name": "survival-transport", "path": "survival/transport.json", "priority": 40 },
    { "name": "survival-comms", "path": "survival/comms.json", "priority": 40 }
  ],
  "featureFlags": {
    "survival": true,
    "commerce": true,
    "work": true,
    "communication": true,
    "customExtensions": true
  }
}
```

### Module Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Unique module identifier |
| `path` | string | Yes | Relative path from `ontology/` root |
| `enabled` | boolean | No | Whether to load this module (default: `true`) |
| `priority` | integer | No | Load order (higher = loaded later, can override earlier modules) |

### Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `survival` | `false` | Enables survival domain modules (hazard, resource, shelter, medical, transport, comms) |
| `commerce` | `false` | Enables commerce domain (pricing, inventory, transactions) |
| `work` | `true` | Enables work domain (jobs, skills, shifts, projects) |
| `communication` | `true` | Enables communication domain (messages, channels, threads) |
| `customExtensions` | `true` | Allows runtime custom modules via config overrides |

**Note:** The default config enables all flags. Production builds can disable unused domains to reduce bundle size.

---

## 2. Module Structure

Each module is a JSON file conforming to the ontology schema (`ontology/schema.json`). A module can contain:

### 2.1 Type Definitions

Types define the primitive vocabulary — operators, constraints, extraction hints, UI widgets.

```json
{
  "$schema": "https://notention.org/ontology-schema.json",
  "$id": "https://notention.org/ontology/custom/types.json",
  "title": "Custom Type Definitions",
  "version": "1.0.0",
  "types": {
    "custom-id": {
      "label": "Custom ID",
      "description": "Application-specific identifier",
      "baseType": "string",
      "operators": {
        "real": ["is", "contains"],
        "imaginary": ["is not"]
      },
      "constraints": {
        "pattern": "^[A-Z]{2}-\\d{4}$"
      },
      "extraction": {
        "hints": ["ID:", "ref:"],
        "normalization": "uppercase"
      },
      "ui": {
        "widget": "text",
        "icon": "id-card"
      }
    }
  }
}
```

#### Type Fields

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Human-readable name |
| `description` | string | Purpose of this type |
| `baseType` | string | Parent type to inherit from (optional) |
| `operators` | object | `{ real: string[], imaginary: string[] }` — match operators this type supports |
| `constraints` | object | JSON Schema-style validation rules |
| `extraction` | object | `{ hints: string[], normalization: string }` — guides for PropertyExtractor |
| `ui` | object | `{ widget: string, icon: string }` — editor hints |

#### Type Inheritance

Types form a hierarchy via `baseType`. Child types inherit:
- Operators (merged: parent's `real` + child's `real`)
- Constraints (deep-merged)
- Extraction hints (concatenated)
- UI widget/icon (child overrides parent)

**Example:** `email` extends `string` → inherits `contains`, adds format constraint.

---

### 2.2 Node Definitions

Nodes define the domain entities (person, job, shelter, etc.) and their attributes.

```json
{
  "$schema": "https://notention.org/ontology-schema.json",
  "$id": "https://notention.org/ontology/custom/domain.json",
  "title": "Custom Domain",
  "version": "1.0.0",
  "extends": ["core-types", "custom-types"],
  "nodes": {
    "volunteer": {
      "label": "Volunteer",
      "description": "A person offering time/skills",
      "extends": "person",
      "attributes": {
        "hoursAvailable": { "type": "number", "description": "Hours per week", "icon": "clock" },
        "skills": { "type": "tags", "description": "Volunteer skills", "icon": "tool" },
        "certifications": { "type": "tags", "description": "Certifications held", "icon": "award" },
        "preferredCauses": { "type": "tags", "description": "Cause areas", "icon": "heart" }
      }
    },
    "shift": {
      "label": "Shift",
      "description": "A volunteer shift assignment",
      "extends": "event",
      "attributes": {
        "role": { "type": "string", "description": "Role in shift", "icon": "user" },
        "volunteers": { "type": "relationship", "description": "Assigned volunteers", "icon": "users", "referenceType": "volunteer" },
        "requiredSkills": { "type": "tags", "description": "Skills needed", "icon": "tool" },
        "status": { "type": "enum", "options": ["open", "filled", "completed", "cancelled"], "description": "Shift status", "icon": "status", "role": "marker" }
      }
    }
  }
}
```

#### Node Fields

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Human-readable name |
| `description` | string | Purpose |
| `abstract` | boolean | If true, node cannot be instantiated directly |
| `extends` | string \| string[] | Parent node(s) to inherit attributes from |
| `attributes` | object | Map of attribute name → attribute definition |

#### Attribute Definition

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | **Required.** References a type name (e.g., `"string"`, `"tags"`, `"enum"`) |
| `description` | string | Human-readable purpose |
| `icon` | string | UI icon name |
| `required` | boolean | Whether this attribute is required for valid instances |
| `role` | `"marker" \| "constraint" \| "fact"` | Semantic role for matching/UI |
| `referenceType` | string | For `relationship`/`entityRef` types: the target node type |
| `default` | any | Default value |
| `options` | string[] | For `enum` types: allowed values |
| `extends` | string | For attribute-level inheritance (rare) |

#### Node Inheritance

Nodes inherit attributes from parents (deep merge). Child attributes:
- **Override** parent attributes with same key
- **Add** new attributes
- **Cannot remove** parent attributes (set `required: false` to effectively disable)

**Priority rule:** Later modules (higher priority) can extend/override nodes from earlier modules.

---

## 3. Adding Custom Ontology Modules

### 3.1 Create Module Files

Create your JSON module files under `ontology/custom/` (or any subdirectory):

```
ontology/
├── config.default.json
├── custom/
│   ├── types.json          # New type definitions
│   ├── volunteer.json      # Volunteer domain nodes
│   └── mutual-aid.json     # Mutual aid domain nodes
```

### 3.2 Register in Configuration

Add your modules to `config.default.json` (or a custom config):

```json
{
  "modules": [
    // ... existing modules ...
    { "name": "custom-types", "path": "custom/types.json", "priority": 50 },
    { "name": "custom-volunteer", "path": "custom/volunteer.json", "priority": 60 },
    { "name": "custom-mutual-aid", "path": "custom/mutual-aid.json", "priority": 60 }
  ]
}
```

**Priority guidelines:**
- `10`: Core type system (`core/types.json`)
- `20`: Core domains (`entity`, `communication`, `event`, `work`, `commerce`)
- `30`: Survival base types
- `40`: Survival domains (`hazard`, `resource`, `shelter`, `medical`, `transport`, `comms`)
- `50+`: Custom/extension modules

### 3.3 Load Custom Config at Runtime

```typescript
import { loadOntology, getOntology, resetOntologyCache } from '@notention/core/ontology/loader';

// Load a custom config (e.g., per-network or per-user)
const ontology = loadOntology('/path/to/custom-config.json');

// Or reset cache and load default with overrides
resetOntologyCache();
const ontology = getOntology(); // uses config.default.json
```

---

## 4. Extending & Overriding Types and Nodes

### 4.1 Via Module Priority (Recommended)

Later modules automatically merge with/override earlier ones:

```json
// custom/types.json (priority: 50)
{
  "types": {
    "string": {
      "operators": {
        "real": ["is", "contains", "starts with", "ends with"],
        "imaginary": ["is not"]
      }
    }
  }
}
```

This extends the base `string` type (from `core/types.json`, priority 10) by adding operators.

### 4.2 Via Config Overrides

For runtime/dynamic overrides without new module files:

```json
{
  "version": "1.0.0",
  "modules": [...],
  "overrides": {
    "types": {
      "string": {
        "constraints": { "maxLength": 500 }
      }
    },
    "nodes": {
      "person": {
        "attributes": {
          "customField": { "type": "string", "description": "Custom field", "icon": "star" }
        }
      }
    }
  }
}
```

Overrides are applied **after** all modules are loaded, with highest precedence.

### 4.3 Extending a Node

To add attributes to an existing node (e.g., add `preferredContact` to `person`):

```json
// custom/extensions.json
{
  "extends": ["core-entity"],
  "nodes": {
    "person": {
      "extends": "person",
      "attributes": {
        "preferredContact": { "type": "enum", "options": ["email", "phone", "signal"], "description": "Preferred contact method", "icon": "mail" }
      }
    }
  }
}
```

**Key:** The node's `extends` points to itself (`"person"`), which tells the loader to merge with the existing `person` definition from earlier modules.

### 4.4 Adding a New Type for an Existing Attribute

If you want an attribute to use a custom type:

```json
// custom/types.json
{
  "types": {
    "skill-level": {
      "label": "Skill Level",
      "baseType": "enum",
      "operators": { "real": ["is", "greater than", "less than"], "imaginary": ["is not"] },
      "constraints": { "enum": ["novice", "intermediate", "expert", "master"] },
      "ui": { "widget": "select", "icon": "graduation-cap" }
    }
  }
}
```

```json
// custom/work-extensions.json
{
  "extends": ["core-work", "custom-types"],
  "nodes": {
    "job": {
      "extends": "job",
      "attributes": {
        "requiredSkillLevel": { "type": "skill-level", "description": "Minimum skill level required", "icon": "graduation-cap" }
      }
    }
  }
}
```

---

## 5. Feature Flag Documentation

Feature flags control which domain modules are active. They are read by the loader and can gate UI/features.

### 5.1 Available Flags

| Flag | Modules Enabled | Use Case |
|------|-----------------|----------|
| `survival` | `survival-types`, `survival-hazard`, `survival-resource`, `survival-shelter`, `survival-medical`, `survival-transport`, `survival-comms` | Disaster response, off-grid, emergency coordination |
| `commerce` | `core-commerce` | Marketplaces, gig work, barter, pricing |
| `work` | `core-work` | Job boards, project collaboration, hiring |
| `communication` | `core-communication` | Messaging, channels, threads, announcements |
| `customExtensions` | (none — enables runtime config overrides) | Per-community custom ontology |

### 5.2 Using Flags in Code

```typescript
import { getOntology } from '@notention/core/ontology/loader';

const ontology = getOntology();
const config = JSON.parse(readFileSync('ontology/config.default.json', 'utf-8'));

if (config.featureFlags?.survival) {
  // Survival nodes available: hazard, shelter, medical, etc.
  const shelterNode = ontology.nodes.get('shelter');
}
```

### 5.3 Per-Network Configuration

Different networks can use different configs:

```json
// network-configs/disaster-response.json
{
  "version": "1.0.0",
  "modules": [
    { "name": "core-types", "path": "core/types.json", "priority": 10 },
    { "name": "core-entity", "path": "core/entity.json", "priority": 20 },
    { "name": "survival-types", "path": "survival/types.json", "priority": 30 },
    { "name": "survival-hazard", "path": "survival/hazard.json", "priority": 40 },
    { "name": "survival-shelter", "path": "survival/shelter.json", "priority": 40 },
    { "name": "survival-medical", "path": "survival/medical.json", "priority": 40 }
  ],
  "featureFlags": {
    "survival": true,
    "commerce": false,
    "work": false,
    "communication": true,
    "customExtensions": true
  }
}
```

---

## 6. Migration Guide: Legacy TS → JSON Modules

### 6.1 What Changed

| Legacy (TypeScript) | New (JSON Modules) |
|---------------------|---------------------|
| `core/src/ontology/*.ts` files | `ontology/*.json` files |
| Hardcoded type definitions | Type inheritance with `baseType` |
| Per-attribute `operators` declarations | Type-owned operator vocabularies |
| `OntologyService` singleton | `loadOntology(configPath)` function |
| No feature flags | `featureFlags` in config |
| No module priority | `priority` per module |

### 6.2 Migration Steps

#### Step 1: Extract Types to `core/types.json`

Each legacy type (string, number, date, geo, enum, boolean, quantity, relationship, tags, etc.) becomes an entry in `types.json` with its operators, constraints, extraction hints, and UI widgets.

#### Step 2: Extract Nodes to Domain Modules

Each domain (entity, communication, event, work, commerce, survival/*) becomes a module with its nodes. Use `extends` for inheritance instead of TypeScript class extension.

**Before (TS):**
```typescript
export const personNode: OntologyNode = {
  id: 'person',
  label: 'Person',
  attributes: {
    name: { key: 'name', type: 'string', required: true, ... },
    email: { key: 'email', type: 'email', ... },
    skills: { key: 'skills', type: 'tags', operators: { real: ['has', 'contains'] }, ... }
  }
};
```

**After (JSON):**
```json
{
  "nodes": {
    "person": {
      "extends": "entity",
      "attributes": {
        "name": { "type": "string", "description": "Full name", "required": true, "icon": "user" },
        "email": { "type": "email", "description": "Email address", "icon": "mail" },
        "skills": { "type": "tags", "description": "Skills and expertise", "icon": "tool" }
      }
    }
  }
}
```

Note: `skills` no longer declares `operators` — it inherits from the `tags` type.

#### Step 3: Remove Redundant Operator Declarations

Search for `operators:` in attribute definitions. If they match the type's defaults, **delete them**. Only keep if genuinely narrowing (e.g., an enum attribute that only allows `is`, not `contains`).

#### Step 4: Update Imports

```typescript
// Old
import { OntologyService } from '@notention/core/ontology/OntologyService';
const ontology = OntologyService.getInstance();

// New
import { getOntology, loadOntology } from '@notention/core/ontology/loader';
const ontology = getOntology(); // or loadOntology('/custom/path.json')
```

#### Step 5: Update Tests

Tests that construct ontology objects directly should use the loader:

```typescript
// Old
import { OntologyService } from '...';
OntologyService.resetForTesting();
OntologyService.getInstance().addNode(customNode);

// New
import { loadOntology, resetOntologyCache } from '...';
resetOntologyCache();
const ontology = loadOntology('ontology/test-config.json');
```

### 6.3 Compatibility Layer

`OntologyService` (in `core/src/ontology/OntologyService.ts`) wraps the new loader for backward compatibility. It delegates to `getOntology()` internally. **Use the loader directly for new code.**

---

## 7. Schema Reference

The JSON Schema for ontology modules is at `ontology/schema.json`. Key definitions:

```json
{
  "TypeDefinition": { ... },
  "NodeDefinition": { ... },
  "AttributeDefinition": { ... },
  "ModuleDefinition": { ... }
}
```

Validate your modules:
```bash
pnpm exec ajv validate -s ontology/schema.json -d ontology/custom/my-module.json
```

---

## 8. Best Practices

1. **Keep types minimal.** Define operators at the type level, not per-attribute.
2. **Use `extends` for nodes.** Don't duplicate attributes — inherit from `entity`, `event`, etc.
3. **Priority order matters.** Core → Domain → Custom. Higher priority wins on conflicts.
4. **Feature-flag domains.** Disable unused domains (commerce, survival) for smaller bundles.
5. **Test with `loadOntology()`.** Unit tests should load a minimal test config, not the full default.
6. **Document custom types.** Add `$id`, `title`, `description` to every module file.

---

## 9. Troubleshooting

### Module Not Loading
- Check `enabled: true` in config
- Verify `path` is relative to `ontology/` root
- Check console for `[Ontology] Failed to load module` errors

### Type Inheritance Not Working
- Ensure `baseType` matches an existing type name exactly
- Check for circular inheritance (loader throws)

### Node Attributes Missing
- Verify parent node name in `extends` matches exactly
- Child attributes **merge** with parent — use same key to override

### Operators Not Available
- Check the attribute's `type` exists in `types` map
- Attribute `operators` (if present) are **filtered** against type defaults — cannot add operators the type doesn't support

---

## 10. Example: Complete Custom Domain

See `ontology/custom/` (create this directory) for a template:

```
ontology/custom/
├── types.json          # Custom types
├── mutual-aid.json     # Mutual aid nodes
└── README.md           # Domain documentation
```

Add to config:
```json
{ "name": "custom-types", "path": "custom/types.json", "priority": 50 },
{ "name": "custom-mutual-aid", "path": "custom/mutual-aid.json", "priority": 60 }
```

Run tests:
```bash
pnpm test --filter @notention/core
```

The ontology will now include your custom domain, available for extraction, matching, and UI.