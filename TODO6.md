# TODO6: Core-First Development Plan
## Pure Semantic Notes + P2P Matching

> **Philosophy:** Skills are bridges to silos. P2P matching is the native solution.  
> **Focus:** Nail the fundamentals before expanding to integration layer.

---

## Executive Vision

**The Core Thesis:**
If Alice posts `[role:is:React Developer][rate < 100][location:near:Austin]` and Bob posts `[role:contains:React][budget < 120][location:is:Austin]`, the system should **match them directly**. No Indeed Skill needed. No external API. Pure P2P semantic coordination.

**The Foundation: Ontology as Schema**

The **ontology is not a feature—it's the architecture**. Everything flows from it:

```typescript
// The ontology defines EVERYTHING:
attributes: {
  rate: {
    type: 'number',           // → Triggers CurrencyWidget
    icon: '💰',               // → Visual identity
    operators: {
      real: ['is', '<', '>'], // → Available comparisons
      imaginary: ['between']  // → Abstract constraints
    }
  },
  location: {
    type: 'geo',              // → Triggers LocationWidget + map
    operators: {
      real: ['is'],
      imaginary: ['is near']  // → Distance-based matching
    }
  }
}
```

**What The Ontology Enables:**

1. ✅ **Dynamic UI Generation** - Widgets, forms, templates auto-generated from ontology
2. ✅ **Type-Aware Matching** - Numbers compare numerically, geo uses距离, dates use time
3. ✅ **Zero-Code Extensibility** - Add property types via JSON, not code
4. ✅ **Semantic Validation** - Operators constrained by type definition
5. ✅ **Network Interoperability** - Shared ontologies enable cross-instance matching
6. ✅ **Progressive Ontology** - Start simple, users extend as they learn

**What This Requires:**
1. ✅ **Ontology-Driven CRUD** - Every UI element references ontology
2. ✅ **Type-Aware Widgets** - `OntologyAttribute.type` → Widget component mapping
3. ✅ **Smart Matching** - Semantic+type overlap scoring
4. ✅ **Privacy-First P2P** - Nostr publishing with ontology sync
5. ✅ **Ontology Evolution** - User-friendly editing, versioning, merging

**What Can Wait:**
- ❌ Skills system (bridges to legacy silos)
- ❌ Agent automation (adds complexity before foundation is solid)
- ❌ LLM integration (nice-to-have, not architectural)
- ❌ Real-time collaboration (scope creep)
- ⚠️ **NOT** Advanced ontology tools (moved to Phase 1 - this IS core)

---

## Feature Gating Strategy

### Core Systems (Always On)
```typescript
// core/src/config/features.ts
export const CORE_FEATURES = {
  NOTES: true,              // Note CRUD operations
  PROPERTIES: true,         // Semantic property parsing
  MATCHING: true,           // Local note matching
  NOSTR: true,              // P2P publishing
  STORAGE: true,            // LocalForage persistence
} as const;
```

### Optional Capabilities (Default: OFF)
```typescript
export const OPTIONAL_FEATURES = {
  SKILLS: false,            // External automation (Indeed, GitHub, etc.)
  AGENT: false,             // VoltAgent automation
  LLM_SUGGESTIONS: false,   // AI-powered property extraction
  ONTOLOGY_TOOLS: false,    // Developer Graph/Debugger views
  COLLABORATION: false,     // Real-time multi-user editing
  ADVANCED_SEARCH: false,   // Full-text search, filters
} as const;
```

### Environment Configuration
```bash
# .env.local (default user experience)
VITE_ENABLE_SKILLS=false
VITE_ENABLE_AGENT=false
VITE_ENABLE_LLM=false
VITE_ENABLE_DEV_TOOLS=false

# .env.developer (power user mode)
VITE_ENABLE_SKILLS=true
VITE_ENABLE_AGENT=true
VITE_ENABLE_LLM=true
VITE_ENABLE_DEV_TOOLS=true
```

---

## Phase 1: Note CRUD Excellence (Weeks 1-3)

### 1.1 Ontology-Generated Templates

**The Insight: Templates ARE Ontology Nodes**

Instead of hardcoding templates, **generate them from the ontology**:

```typescript
// core/src/templates/TemplateGenerator.ts
export function generateTemplatesFromOntology(ontology: OntologyNode[]): Template[] {
  const templates: Template[] = [];
  
  // Find nodes with actionLabel (e.g., "Post Job", "Sell Product")
  ontology.forEach(node => {
    if (node.actionLabel && node.attributes) {
      templates.push({
        id: node.id,
        label: node.actionLabel,
        icon: getNodeIcon(node),
        ontologyNodeId: node.id,
        properties: node.requiredAttributes?.map(key => ({
          key,
          operator: getDefaultOperator(node.attributes[key]),
          values: [getDefaultValue(node.attributes[key])]
        })) || []
      });
    }
  });
  
  return templates;
}
```

**Example from DEFAULT_ONTOLOGY:**
```typescript
{
  id: 'job-request',
  label: 'Job Request',
  actionLabel: 'Post Job',           // ← Becomes template button
  requiredAttributes: ['role'],      // ← Pre-filled properties
  attributes: {
    role: { type: 'string', icon: '💼', ... },
    rate: { type: 'number', icon: '💰', ... },
    location: { type: 'geo', icon: '📍', ... }
  }
}
// → Template: "Post Job" with role, rate, location properties
```

**Dynamic Template UI:**
```tsx
// ui/src/components/notes/NoteCreator.tsx
export const NoteCreator = () => {
  const { ontology } = useSettings();
  const templates = useMemo(
    () => generateTemplatesFromOntology(ontology),
    [ontology]
  );
  
  return (
    <QuickTemplates>
      {templates.map(template => (
        <Template
          key={template.id}
          icon={template.icon}
          onClick={() => createFromTemplate(template, ontology)}
        >
          {template.label}
        </Template>
      ))}
      <Template icon="📝" onClick={() => create('Blank')}>
        Blank Note
      </Template>
    </QuickTemplates>
  );
};
```

**Benefits:**
- ✅ **Zero Hardcoding:** Templates emerge from ontology
- ✅ **User Extensible:** Add ontology node → new template appears
- ✅ **Consistent:** Template properties match ontology definitions
- ✅ **Validated:** Required attributes enforced automatically

**Success Criteria:**
- User can create fully-formed note in <30 seconds
- Zero syntax errors from templates
- Templates update automatically when ontology changes
- Users can create custom templates by defining ontology nodes

---

### 1.2 Ontology-Driven Type System

**Philosophy:** Widget types are NOT hardcoded. They're determined by the ontology.

#### Type System Definition
```typescript
// core/src/types/index.ts
export interface OntologyAttribute {
  type: 'string' | 'date' | 'number' | 'enum' | 'datetime' | 'geo' | 'relationship';
  description?: string;
  icon?: string;
  options?: string[];  // for enum type
  operators: {
    real: string[];      // Concrete operators (is, <, >, near)
    imaginary: string[]; // Abstract operators (contains, matches)
  };
  referenceType?: string; // for relationship type
}
```

#### Widget Type Mapping
```typescript
// Ontology type → Widget component
const WIDGET_MAP = {
  'number':     CurrencyWidget,    // Slider + numeric input
  'geo':        LocationWidget,    // Geocoding + map
  'date':       DateWidget,        // Calendar picker
  'datetime':   DateWidget,        // Calendar + time
  'enum':       EnumWidget,        // Dropdown selector
  'string':     TextWidget,        // Standard input
  'relationship': RelationshipWidget, // Entity picker
};
```

#### Example Ontology Definitions
```typescript
// In your ontology configuration
const ontology: OntologyNode[] = [
  {
    id: 'employment',
    label: 'Employment',
    attributes: {
      role: {
        type: 'string',
        icon: '💼',
        operators: {
          real: ['is'],
          imaginary: ['contains', 'matches']
        }
      },
      rate: {
        type: 'number',
        icon: '💰',
        operators: {
          real: ['is', '<', '>', '<=', '>='],
          imaginary: ['between']
        }
      },
      location: {
        type: 'geo',
        icon: '📍',
        operators: {
          real: ['is', 'near'],
          imaginary: []
        }
      },
      remote: {
        type: 'enum',
        icon: '🏠',
        options: ['true', 'false', 'hybrid'],
        operators: {
          real: ['is'],
          imaginary: []
        }
      }
    }
  }
];
```

**Benefits:**
- ✅ **Extensible:** Add new property types by updating ontology, not code
- ✅ **Consistent:** Same type always uses same widget
- ✅ **Discoverable:** Users see appropriate controls automatically
- ✅ **Validated:** Operators are constrained by type definition

---

### 1.3 Property Block UI
**Current Pain Points:**
- Text-only property editing is fragile
- Operators like `<`, `>`, `near` are unintuitive
- No validation or type safety

**Solution: Notion-Style Property Blocks**

#### Visual State Machine
```
Property Block States:
┌─────────────────────────┐
│ View Mode (default)     │  ← Click to edit
│ 💰 rate  is  $85/hr  ✓ │
└─────────────────────────┘
         ↓ (click)
┌─────────────────────────────────────────┐
│ Edit Mode                               │
│ ┌────┐ ┌────┐ ┌──────────────────────┐│
│ │rate│ │ is │ │85    ▼ USD/hr     [✓]││  ← Inline editing
│ └────┘ └────┘ └──────────────────────┘│
│                                         │
│ ════════════╸ $85                     │  ← Linked slider
│ $0                              $200  │
└─────────────────────────────────────────┘
         ↓ (Enter or ✓)
┌─────────────────────────┐
│ View Mode (updated)     │  ← Animated transition
│ 💰 rate  is  $85/hr  ✓ │  ← Green glow (300ms)
└─────────────────────────┘
```

#### Component Implementation
```tsx
// ui/src/components/properties/PropertyBlock.tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { Property, OntologyNode } from '@notention/core';
import { findAttributeDef } from '@notention/core/ontologyHelpers';
import { CurrencyWidget } from './widgets/CurrencyWidget';
import { LocationWidget } from './widgets/LocationWidget';
import { DateWidget } from './widgets/DateWidget';
import { EnumWidget } from './widgets/EnumWidget';
import { TextWidget } from './widgets/TextWidget';

interface PropertyBlockProps {
  property: Property;
  onUpdate: (updated: Property) => void;
  onDelete: () => void;
  ontology: OntologyNode[];  // Required for type lookup
  autoFocus?: boolean;
}

export const PropertyBlock = ({
  property,
  onUpdate,
  onDelete,
  ontology,
  autoFocus
}: PropertyBlockProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(property.values[0]);
  const [hasChanges, setHasChanges] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  // Auto-focus if requested (template flow)
  useEffect(() => {
    if (autoFocus) {
      setIsEditing(true);
    }
  }, [autoFocus]);

  const handleSave = useCallback(() => {
    if (hasChanges) {
      onUpdate({ ...property, values: [localValue] });
      
      // Success animation
      blockRef.current?.classList.add('property-saved');
      setTimeout(() => {
        blockRef.current?.classList.remove('property-saved');
      }, 600);
    }
    setIsEditing(false);
    setHasChanges(false);
  }, [hasChanges, localValue, property, onUpdate]);

  const handleCancel = useCallback(() => {
    setLocalValue(property.values[0]);
    setIsEditing(false);
    setHasChanges(false);
  }, [property]);

  const handleChange = useCallback((value: string) => {
    setLocalValue(value);
    setHasChanges(value !== property.values[0]);
  }, [property]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  // Infer widget type from ontology attribute definition
  const getWidget = () => {
    const widgetProps = {
      value: localValue,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      operator: property.operator,
    };

    // Look up attribute type from ontology
    const attributeDef = findAttributeDef(property.key, ontology);
    const attributeType = attributeDef?.type || 'string';

    // Type-specific widgets based on ontology
    switch (attributeType) {
      case 'number':
        return <CurrencyWidget {...widgetProps} />;
      case 'geo':
        return <LocationWidget {...widgetProps} />;
      case 'date':
      case 'datetime':
        return <DateWidget {...widgetProps} />;
      case 'enum':
        return <EnumWidget {...widgetProps} options={attributeDef?.options || []} />;
      case 'string':
      default:
        return <TextWidget {...widgetProps} />;
    }
  };

  return (
    <div
      ref={blockRef}
      className={`
        property-block
        ${isEditing ? 'is-editing' : ''}
        ${hasChanges ? 'has-changes' : ''}
      `}
      onClick={() => !isEditing && setIsEditing(true)}
    >
      {!isEditing ? (
        // View Mode
        <div className="property-view">
          <span className="property-icon">{getPropertyIcon(property.key)}</span>
          <span className="property-key">{property.key}</span>
          <span className="property-operator">{property.operator}</span>
          <span className="property-value">{formatValue(property)}</span>
          {isValid(property) && <span className="property-check">✓</span>}
          <button
            className="property-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete property"
          >
            ×
          </button>
        </div>
      ) : (
        // Edit Mode
        <div className="property-edit">
          <div className="property-fields">
            {/* Key field (read-only for now, show icon) */}
            <span className="property-icon">{getPropertyIcon(property.key)}</span>
            <span className="property-key-label">{property.key}</span>
            
            {/* Operator selector */}
            <OperatorDropdown
              value={property.operator}
              options={getValidOperators(property.key, ontology)}
              onChange={(op) => onUpdate({ ...property, operator: op })}
            />
            
            {/* Type-specific widget */}
            <div className="property-value-widget">
              {getWidget()}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="property-actions">
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              ✓ Save
            </button>
            <button className="btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
const getPropertyIcon = (key: string): string => {
  const icons: Record<string, string> = {
    role: '💼',
    rate: '💰',
    location: '📍',
    remote: '🏠',
    deadline: '📅',
    experience: '📊',
    skill: '⚡',
  };
  return icons[key] || '🏷️';
};

const formatValue = (prop: Property): string => {
  if (prop.key.match(/rate|price|cost/)) {
    return `$${prop.values[0]}`;
  }
  return prop.values[0] || '(empty)';
};

const isValid = (prop: Property): boolean => {
  return prop.values[0] && prop.values[0].length > 0;
};

const getValidOperators = (key: string, ontology: OntologyNode[]): string[] => {
  const attributeDef = findAttributeDef(key, ontology);
  
  if (!attributeDef) {
    // Default operators for unknown attributes
    return ['is', 'contains', 'matches'];
  }
  
  // Return operators from ontology definition
  // Combine real and imaginary operators
  return [
    ...attributeDef.operators.real,
    ...attributeDef.operators.imaginary
  ];
};
```

#### Type-Specific Widgets

**Currency Widget**
```tsx
// ui/src/components/properties/widgets/CurrencyWidget.tsx
export const CurrencyWidget = ({ value, onChange, onKeyDown }) => {
  const [numericValue, setNumericValue] = useState(
    parseFloat(value) || 0
  );
  const [unit, setUnit] = useState('USD/hr');

  const handleSliderChange = (newValue: number) => {
    setNumericValue(newValue);
    onChange(`${newValue}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      setNumericValue(parsed);
      onChange(`${parsed}`);
    }
  };

  return (
    <div className="currency-widget">
      <div className="currency-input-group">
        <span className="currency-symbol">$</span>
        <input
          type="number"
          value={numericValue}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          className="currency-input"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="unit-selector"
        >
          <option value="USD/hr">/hr</option>
          <option value="USD/day">/day</option>
          <option value="USD/week">/wk</option>
          <option value="USD/year">/yr</option>
        </select>
      </div>
      
      {/* Linked slider */}
      <div className="currency-slider">
        <input
          type="range"
          min="0"
          max="200"
          step="5"
          value={numericValue}
          onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
          className="slider"
        />
        <div className="slider-labels">
          <span>$0</span>
          <span>$200</span>
        </div>
      </div>
    </div>
  );
};
```

**Location Widget**
```tsx
// ui/src/components/properties/widgets/LocationWidget.tsx
import { useState } from 'react';

export const LocationWidget = ({ value, onChange, operator, onKeyDown }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const handleInputChange = async (input: string) => {
    onChange(input);
    
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }

    // Geocoding API call
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&q=${encodeURIComponent(input)}&limit=5`
      );
      const data = await response.json();
      setSuggestions(data.map(item => item.display_name));
    } catch (error) {
      console.error('Geocoding failed:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  return (
    <div className="location-widget">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="City, State, Country"
        className="location-input"
      />
      
      {suggestions.length > 0 && (
        <div className="location-suggestions">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              className="suggestion-item"
              onClick={() => {
                onChange(suggestion);
                setSuggestions([]);
              }}
            >
              📍 {suggestion}
            </button>
          ))}
        </div>
      )}
      
      {operator === 'near' && (
        <div className="radius-control">
          <label>Within:</label>
          <input type="number" defaultValue="50" /> mi
        </div>
      )}
    </div>
  );
};
```

**Boolean Widget**
```tsx
// ui/src/components/properties/widgets/BooleanWidget.tsx
export const BooleanWidget = ({ value, onChange }) => {
  const isTrue = value === 'true' || value === true;

  return (
    <div className="boolean-widget">
      <button
        className={`boolean-option ${isTrue ? 'active' : ''}`}
        onClick={() => onChange('true')}
      >
        ✓ Yes
      </button>
      <button
        className={`boolean-option ${!isTrue ? 'active' : ''}`}
        onClick={() => onChange('false')}
      >
        No
      </button>
    </div>
  );
};
```

#### Visual Feedback Specifications

**Animation Timings**
```css
/* ui/src/styles/property-blocks.css */

/* Property block transitions */
.property-block {
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.property-block:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.15);
}

.property-block.is-editing {
  background-color: #1f2937; /* gray-800 */
  border-color: #60a5fa; /* blue-400 */
  box-shadow: 0 0 0 1px #60a5fa;
}

/* Success glow animation */
@keyframes property-save-glow {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.property-block.property-saved {
  animation: property-save-glow 600ms ease-out;
}

/* Checkmark appear */
@keyframes checkmark-appear {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(0deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.property-check {
  animation: checkmark-appear 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
  color: #10b981; /* green-500 */
}

/* Slider thumb */
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #60a5fa;
  cursor: pointer;
  transition: transform 150ms ease-out;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.slider::-webkit-slider-thumb:active {
  transform: scale(0.95);
}
```

**Success Criteria:**
- Zero property syntax errors
- Users can edit properties without knowing syntax
- 10x faster than typing `[key:op:value]`
- Smooth transitions (250-300ms)
- Immediate visual feedback (<100ms)

---

### 1.4 Inline Property Editing
**Vision:** Properties feel native to the document, not bolted-on

```tsx
// Hybrid text + blocks
<NoteEditor>
  <TextBlock>
    Looking for a React developer to join our startup.
  </TextBlock>
  
  <PropertyBlocks>
    {/* Each block references ontology for widget type */}
    <PropertyBlock 
      key="role" 
      operator="contains" 
      value="React"
      ontology={ontology}  // Type lookup: string → TextWidget
    />
    <PropertyBlock 
      key="rate" 
      operator="<" 
      value="100"
      ontology={ontology}  // Type lookup: number → CurrencyWidget
    />
    <PropertyBlock 
      key="location" 
      operator="near" 
      value="Austin, TX" 
      ontology={ontology}  // Type lookup: geo → LocationWidget
    />
  </PropertyBlocks>
  
  <TextBlock>
    We're building a decentralized semantic coordination platform...
  </TextBlock>
</NoteEditor>
```

**Keyboard Navigation:**
- `Tab` between property fields
- `Enter` creates new property block
- `Backspace` on empty property deletes it
- `/` opens property palette (Notion-style, populated from ontology)
- `Cmd+K` opens command palette

**Success Criteria:**
- Editing flow feels as smooth as Notion
- No context switching between "text mode" and "property mode"
- Power users can navigate entirely via keyboard
- Widget types always match ontology definitions

---

## Phase 2: Semantic Matching (Weeks 4-6)

### 2.1 Enhanced Matching Algorithm
**Current State:** Basic scoring in `ontologyHelpers.ts`

**Improvements Needed:**

```typescript
// core/src/matching/semanticMatcher.ts
interface MatchResult {
  score: number;           // 0.0 - 1.0
  matches: PropertyMatch[];
  conflicts: PropertyConflict[];
  confidence: number;      // How certain is this match?
}

interface PropertyMatch {
  requestProp: Property;
  offerProp: Property;
  compatibility: number;   // How well do they align?
  reason: string;          // "Both specify React, exact match"
}

interface PropertyConflict {
  requestProp: Property;
  offerProp: Property;
  reason: string;          // "Request wants <$80/hr, Offer is $100/hr"
}

export function matchNotes(request: Note, offer: Note): MatchResult {
  const matches: PropertyMatch[] = [];
  const conflicts: PropertyConflict[] = [];
  
  // Example: [role:contains:React] matches [role:is:React Developer]
  for (const reqProp of request.properties) {
    for (const offProp of offer.properties) {
      if (keysAreCompatible(reqProp.key, offProp.key)) {
        const compat = scoreCompatibility(reqProp, offProp);
        
        if (compat > 0.5) {
          matches.push({
            requestProp: reqProp,
            offerProp: offProp,
            compatibility: compat,
            reason: explainMatch(reqProp, offProp)
          });
        } else if (compat < 0) {
          conflicts.push({
            requestProp: reqProp,
            offerProp: offProp,
            reason: explainConflict(reqProp, offProp)
          });
        }
      }
    }
  }
  
  // Overall score: weighted by importance
  const score = calculateWeightedScore(matches, conflicts, request, offer);
  
  return { score, matches, conflicts, confidence: estimateConfidence(matches) };
}
```

**Operator Semantics:**

| Request Op | Offer Op | Compatible? | Example |
|------------|----------|-------------|---------|
| `contains` | `is` | ✅ Yes | `[skill:contains:React]` ↔ `[skill:is:React Developer]` |
| `<` | `is` | ✅ If value satisfies | `[rate < 100]` ↔ `[rate:is:80]` ✅ |
| `>` | `is` | ✅ If value satisfies | `[experience > 3]` ↔ `[experience:is:5 years]` ✅ |
| `near` | `is` | ✅ If within radius | `[location:near:Austin]` ↔ `[location:is:Round Rock, TX]` ✅ |
| `is` | `is` | ✅ If equal | `[remote:is:true]` ↔ `[remote:is:true]` ✅ |

**Success Criteria:**
- 90% match accuracy (validated against manual review)
- No false positives due to name collisions
- Clear conflict explanations

---

### 2.2 Match Visualization
**Problem:** Users don't know WHY notes matched

**Solution: Explainable Matching**

```tsx
// ui/src/components/matching/MatchCard.tsx
<MatchCard match={matchResult}>
  <MatchScore score={matchResult.score} />
  
  <MatchDetails>
    <h4>Why this match?</h4>
    {matchResult.matches.map(m => (
      <MatchRow key={m.requestProp.key}>
        <PropertyChip property={m.requestProp} label="You" />
        <CompatibilityBadge score={m.compatibility} />
        <PropertyChip property={m.offerProp} label="Them" />
        <Explanation>{m.reason}</Explanation>
      </MatchRow>
    ))}
    
    {matchResult.conflicts.length > 0 && (
      <>
        <h4>⚠️ Potential Issues</h4>
        {matchResult.conflicts.map(c => (
          <ConflictRow>
            <PropertyChip property={c.requestProp} label="You" />
            <ConflictIcon />
            <PropertyChip property={c.offerProp} label="Them" />
            <Explanation>{c.reason}</Explanation>
          </ConflictRow>
        ))}
      </>
    )}
  </MatchDetails>
  
  <Actions>
    <Button onClick={() => viewFullNote(match.note)}>
      View Full Note
    </Button>
    <Button variant="primary" onClick={() => initiateContact(match.note)}>
      Connect via Nostr
    </Button>
  </Actions>
</MatchCard>
```

**Success Criteria:**
- Users understand match reasoning without reading code
- Conflicts are surfaced proactively
- One-click to initiate contact

---

### 2.3 Local Matching (Private Notes)
**Use Case:** Match against own notes before publishing

```typescript
// User creates: [role:contains:React][rate < 100]
// System finds their own saved notes:
// - Previous job search: [role:is:React Developer][rate:is:85]
// → "You searched for similar before. Reuse that note?"
```

**Benefits:**
- Discover own past research
- Avoid duplicates
- Refine searches based on history

**Success Criteria:**
- Local matching runs on every note save
- Results appear in sidebar within 100ms
- Users can merge/deduplicate notes

---

## Phase 3: Privacy-First P2P (Weeks 7-9)

### 3.1 Privacy Controls UI
**Current State:** Privacy logic exists, UI is minimal

```tsx
// ui/src/components/publish/PublishPanel.tsx
<PublishPanel note={note}>
  <PrivacyStatus>
    {note.public ? (
      <Badge variant="success">
        🌐 Public - Anyone can see this
      </Badge>
    ) : (
      <Badge variant="default">
        🔒 Private - Only you can see this
      </Badge>
    )}
  </PrivacyStatus>
  
  <PublishOptions>
    {!note.public && (
      <Alert variant="info">
        This note is private. To find matches on the network, you must make it public.
      </Alert>
    )}
    
    <Toggle
      checked={note.public}
      onChange={handlePrivacyToggle}
      label="Make this note publicly visible"
    />
    
    {note.public && (
      <RelaySelector
        selected={selectedRelays}
        onChange={setSelectedRelays}
        options={NOSTR_RELAYS}
      />
    )}
  </PublishOptions>
  
  <PublishButton
    disabled={!note.public}
    onClick={publishToNostr}
  >
    Publish to Network
  </PublishButton>
</PublishPanel>
```

**Success Criteria:**
- Zero accidental public posts
- Clear visual distinction between public/private
- One-click publish flow

---

### 3.2 Network Discovery
**Goal:** Find matches on Nostr network

```typescript
// core/src/nostr/discovery.ts
export async function discoverMatches(
  localNote: Note,
  relays: string[]
): Promise<MatchResult[]> {
  // Only search if local note is public
  if (!localNote.public) {
    throw new PrivacyError('Cannot search network with private note');
  }
  
  // Query Nostr for notes with similar properties
  const filter = buildNostrFilter(localNote);
  const remoteNotes = await nostrClient.query(relays, filter);
  
  // Local semantic matching
  const matches = remoteNotes
    .map(remote => matchNotes(localNote, remote))
    .filter(m => m.score > 0.6)
    .sort((a, b) => b.score - a.score);
  
  return matches;
}
```

**Success Criteria:**
- Search completes in <3 seconds
- Only high-quality matches (score > 0.6) shown
- Results cached for 5 minutes

---

### 3.3 Contact Initiation
**Problem:** Found a match, now what?

**Solution: Nostr DMs**

```tsx
<MatchCard match={result}>
  <ContactButton onClick={() => sendDM(result.note.author)}>
    Send Message
  </ContactButton>
</MatchCard>

// Opens DM composer
<DMComposer recipient={result.note.author}>
  <Template>
    Hi! I saw your note about {result.note.title}.
    I'm looking for {summarize(localNote)}.
    Would you like to connect?
  </Template>
</DMComposer>
```

**Success Criteria:**
- One-click to initiate contact
- Pre-filled message template
- Respects Nostr DM encryption

---

## Phase 4: Ergonomic Refinements (Weeks 10-12)

### 4.1 Keyboard Shortcuts

**Complete Keyboard Reference**
```typescript
// ui/src/hooks/useKeyboardShortcuts.ts
export const KEYBOARD_SHORTCUTS = {
  // Global
  'Cmd+N': { action: createNote, description: 'New note' },
  'Cmd+K': { action: openCommandPalette, description: 'Command palette' },
  'Cmd+P': { action: openPropertyPalette, description: 'Property palette' },
  'Cmd+/': { action: togglePropertyPanel, description: 'Toggle property panel' },
  'Cmd+Enter': { action: saveNote, description: 'Save note' },
  'Cmd+Shift+P': { action: publishNote, description: 'Publish to network' },
  'Esc': { action: closeModal, description: 'Close modal/cancel' },
  
  // Editor
  'Tab': { action: nextPropertyField, description: 'Next property field' },
  'Shift+Tab': { action: prevPropertyField, description: 'Previous field' },
  '/': { action: openPropertyPalette, description: 'Insert property' },
  '@': { action: mentionContact, description: 'Mention contact' },
  '#': { action: addTag, description: 'Add tag' },
  
  // Property Editing
  'Enter': { action: saveProperty, description: 'Save property', context: 'property' },
  'Esc': { action: cancelEdit, description: 'Cancel editing', context: 'property' },
  'Backspace': { action: deleteProperty, description: 'Delete (when empty)', context: 'property' },
  'ArrowUp': { action: selectPreviousProperty, description: 'Previous property' },
  'ArrowDown': { action: selectNextProperty, description: 'Next property' },
  
  // Slider (when focused)
  'ArrowLeft': { action: decrementValue, description: 'Decrease value', context: 'slider' },
  'ArrowRight': { action: incrementValue, description: 'Increase value', context: 'slider' },
  'Shift+ArrowLeft': { action: decrementValueLarge, description: 'Decrease by 10', context: 'slider' },
  'Shift+ArrowRight': { action: incrementValueLarge, description: 'Increase by 10', context: 'slider' },
} as const;

// Hook implementation
export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = [
        e.metaKey && 'Cmd',
        e.ctrlKey && 'Ctrl',
        e.shiftKey && 'Shift',
        e.altKey && 'Alt',
        e.key
      ].filter(Boolean).join('+');

      const shortcut = KEYBOARD_SHORTCUTS[key];
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

**Keyboard Hints UI**
```tsx
// Show keyboard hints on hover
<Tooltip shortcut="Cmd+K">
  <button>Command Palette</button>
</Tooltip>

// Permanent hint in footer
<KeyboardHints>
  <Hint>Cmd+N New</Hint>
  <Hint>Cmd+K Commands</Hint>
  <Hint>/ Properties</Hint>
</KeyboardHints>
```

---

### 4.2 Command Palette
**Inspired by:** VSCode, Raycast

**Visual Design**
```
┌─────────────────────────────────────┐
│ Search or run command...      [⎋ ]│  ← Input field
├─────────────────────────────────────┤
│ Actions                             │
│ ┌─────────────────────────────────┐│
│ │ 📝 Create Note          Cmd+N   ││  ← Selected
│ └─────────────────────────────────┘│
│  🔍 Search Notes          Cmd+F    │
│  🌐 Search Network                 │
│  🗑️  Delete Note          Del      │
├─────────────────────────────────────┤
│ Properties                          │
│  💼 Add Role                        │
│  💰 Add Rate                        │
│  📍 Add Location                    │
└─────────────────────────────────────┘
   ↑↓ Navigate  ↵ Select  ⎋ Cancel
```

**Implementation**
```tsx
// ui/src/components/common/CommandPalette.tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';  // Fuzzy search

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  group: string;
}

export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    {
      id: 'create-note',
      label: 'Create Note',
      icon: '📝',
      shortcut: 'Cmd+N',
      action: createNote,
      group: 'Actions'
    },
    {
      id: 'search-local',
      label: 'Search Notes',
      icon: '🔍',
      shortcut: 'Cmd+F',
      action: searchLocal,
      group: 'Actions'
    },
    {
      id: 'search-network',
      label: 'Search Network',
      icon: '🌐',
      action: searchNetwork,
      group: 'Actions'
    },
    {
      id: 'add-role',
      label: 'Add Role Property',
      icon: '💼',
      action: () => addProperty('role'),
      group: 'Properties'
    },
    // ... more commands
  ];

  // Fuzzy search
  const fuse = new Fuse(commands, {
    keys: ['label', 'description'],
    threshold: 0.3,
  });

  const filteredCommands = query
    ? fuse.search(query).map(result => result.item)
    : commands;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filteredCommands[selectedIndex]?.action();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filteredCommands, selectedIndex, onClose]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search or run command..."
          className="command-input"
        />
        
        <div className="command-list">
          {Object.entries(
            filteredCommands.reduce((groups, cmd) => {
              (groups[cmd.group] ||= []).push(cmd);
              return groups;
            }, {} as Record<string, Command[]>)
          ).map(([group, groupCommands]) => (
            <div key={group} className="command-group">
              <div className="command-group-label">{group}</div>
              {groupCommands.map((cmd, index) => {
                const globalIndex = filteredCommands.indexOf(cmd);
                return (
                  <button
                    key={cmd.id}
                    className={`command-item ${
                      globalIndex === selectedIndex ? 'selected' : ''
                    }`}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                  >
                    <span className="command-icon">{cmd.icon}</span>
                    <span className="command-label">{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="command-shortcut">{cmd.shortcut}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="command-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>⎋ Cancel</span>
        </div>
      </div>
    </div>
  );
};
```

**Styling**
```css
/* ui/src/styles/command-palette.css */
.command-palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20vh;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.command-palette {
  width: 600px;
  max-height: 400px;
  background: #1f2937;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  border: 1px solid #374151;
  overflow: hidden;
  animation: palette-enter 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes palette-enter {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.command-input {
  width: 100%;
  padding: 16px 20px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #374151;
  color: #f3f4f6;
  font-size: 16px;
  outline: none;
}

.command-list {
  max-height: 300px;
  overflow-y: auto;
}

.command-group-label {
  padding: 8px 20px;
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.command-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  color: #d1d5db;
  cursor: pointer;
  transition: background 150ms ease;
}

.command-item.selected {
  background: #374151;
}

.command-item:hover {
  background: #374151;
}

.command-icon {
  font-size: 18px;
}

.command-label {
  flex: 1;
  text-align: left;
}

.command-shortcut {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.command-footer {
  display: flex;
  gap: 16px;
  padding: 8px 20px;
  border-top: 1px solid #374151;
  font-size: 12px;
  color: #6b7280;
}
```

---

### 4.3 Property Palette (Slash Commands)
**Inspired by:** Notion

**Trigger:** Type `/` in editor

**Visual Design**
```
Description field:
We're looking for someone with ex/|
                                ↓
┌─────────────────────────────────┐
│ Add Property             [⎋ ]  │
├─────────────────────────────────┤
│ 💼 role                         │  ← Fuzzy match
│    Add a role or skill          │
│ 💰 rate                         │
│    Hourly or daily rate         │
│ 📅 deadline                     │
│    Due date or time             │
│ ─────────────────────────────── │
│ ➕ Custom Property              │
└─────────────────────────────────┘
```

**Implementation**
```tsx
// ui/src/components/editor/PropertyPalette.tsx
export const PropertyPalette = ({ onInsert, onClose }) => {
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const properties = [
    { key: 'role', icon: '💼', description: 'Add a role or skill' },
    { key: 'rate', icon: '💰', description: 'Hourly or daily rate' },
    { key: 'location', icon: '📍', description: 'Geographic location' },
    { key: 'remote', icon: '🏠', description: 'Remote work option' },
    { key: 'deadline', icon: '📅', description: 'Due date or time' },
    { key: 'experience', icon: '📊', description: 'Years of experience' },
    { key: 'skill', icon: '⚡', description: 'Technical skill' },
  ];

  const filtered = filter
    ? properties.filter(p => 
        p.key.includes(filter.toLowerCase()) ||
        p.description.toLowerCase().includes(filter.toLowerCase())
      )
    : properties;

  const handleSelect = (property: typeof properties[0]) => {
    onInsert(property.key);
    onClose();
  };
  
  return (
    <div className="property-palette">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search properties..."
        autoFocus
      />
      
      <div className="property-options">
        {filtered.map((prop, i) => (
          <button
            key={prop.key}
            className={`property-option ${i === selectedIndex ? 'selected' : ''}`}
            onClick={() => handleSelect(prop)}
          >
            <span className="property-icon">{prop.icon}</span>
            <div className="property-info">
              <div className="property-key">{prop.key}</div>
              <div className="property-description">{prop.description}</div>
            </div>
          </button>
        ))}
        
        {filter && (
          <button
            className="property-option custom"
            onClick={() => handleSelect({ key: filter, icon: '🏷️', description: 'Custom property' })}
          >
            <span className="property-icon">➕</span>
            <div className="property-info">
              <div className="property-key">Custom "{filter}"</div>
              <div className="property-description">Create new property</div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
```

---

## Phase 5: Polish & Onboarding (Weeks 13-15)

### 5.1 First-Run Experience
```tsx
<OnboardingFlow>
  <Step title="Welcome to Notention">
    A semantic notebook for P2P coordination.
    Your notes can find matches on the network.
  </Step>
  
  <Step title="Create Your First Note">
    <Template>Job Offer</Template>
    {/* Pre-filled with example properties */}
  </Step>
  
  <Step title="Add Properties">
    {/* Interactive tutorial on property blocks */}
  </Step>
  
  <Step title="Find Matches">
    {/* Explain local vs. network matching */}
  </Step>
  
  <Step title="Privacy First">
    {/* Explain public/private toggle */}
  </Step>
</OnboardingFlow>
```

---

### 5.2 Example Notes Library
**Goal:** Users learn by example

```typescript
const EXAMPLES = [
  {
    title: 'Hiring: React Developer',
    properties: [
      { key: 'role', operator: 'is', values: ['React Developer'] },
      { key: 'rate', operator: 'is', values: ['$85/hr'] },
      { key: 'location', operator: 'is', values: ['Austin, TX'] },
      { key: 'remote', operator: 'is', values: ['true'] },
    ],
    public: false,
  },
  {
    title: 'Looking for: Freelance Designer',
    properties: [
      { key: 'role', operator: 'contains', values: ['Designer'] },
      { key: 'rate', operator: '<', values: ['100'] },
      { key: 'location', operator: 'near', values: ['San Francisco'] },
    ],
    public: false,
  },
];
```

**UI:**
```tsx
<ExamplesLibrary>
  {EXAMPLES.map(ex => (
    <ExampleCard onClick={() => createFromExample(ex)}>
      <h3>{ex.title}</h3>
      <PropertyPreview>{ex.properties}</PropertyPreview>
      <Button>Use This Template</Button>
    </ExampleCard>
  ))}
</ExamplesLibrary>
```

---

## Implementation Priorities

### Week 1-3: Note CRUD
- [ ] Template system
- [ ] Property block UI components
- [ ] Inline property editing
- [ ] Keyboard shortcuts

### Week 4-6: Matching
- [ ] Enhanced matching algorithm
- [ ] Match visualization UI
- [ ] Local matching (private notes)
- [ ] Test with real data

### Week 7-9: P2P
- [ ] Privacy controls UI
- [ ] Network discovery
- [ ] Contact initiation (Nostr DMs)
- [ ] Relay management

### Week 10-12: Refinement
- [ ] Command palette
- [ ] Property palette (slash commands)
- [ ] Performance optimization
- [ ] Accessibility audit

### Week 13-15: Launch
- [ ] Onboarding flow
- [ ] Example library
- [ ] Documentation
- [ ] Public beta

---

## What Gets Disabled (Default)

### ❌ Skills System
**Rationale:** Skills bridge to silos. P2P matching is native.

**Gating:**
```typescript
if (import.meta.env.VITE_ENABLE_SKILLS === 'true') {
  // Load skill system
  const { SkillExecutor } = await import('@notention/core/skillExecutor');
  const { SkillRegistry } = await import('@notention/agent/skills');
}
```

**UI Impact:**
- Skill Gallery hidden
- "Execute Skills" button removed
- Agent status panel hidden

---

### ❌ LLM Suggestions
**Rationale:** Smart property extraction is nice-to-have, not core.

**Gating:**
```typescript
if (import.meta.env.VITE_ENABLE_LLM === 'true') {
  const { WebLLMProvider } = await import('./services/ai');
  // Enable AI-powered property extraction
}
```

**UI Impact:**
- "AI Suggestions" panel hidden
- Property extraction is manual/template-based

---

### ❌ Developer Tools
**Rationale:** Ontology graph, parser debugger are for advanced users.

**Gating:**
```typescript
if (import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true') {
  // Show Developer menu
  // Enable ontology visualizer, parser debugger, etc.
}
```

**UI Impact:**
- Developer menu hidden from sidebar
- Focus on user-facing features

---

### ❌ Real-Time Collaboration
**Rationale:** Out of scope for MVP. Notes are single-author.

**Future:** Could enable with CRDT-based sync later.

---

### ✅ What Stays Enabled

- **Core Note CRUD** - Always on
- **Semantic Properties** - Always on
- **Local Matching** - Always on
- **Nostr P2P** - Always on
- **Privacy Controls** - Always on
- **Offline Storage** - Always on

---

## Success Metrics

### User Experience (Qualitative)
- **Onboarding:** 90% of users complete first note within 3 minutes
- **Property Blocks:** 80% prefer visual blocks over text syntax
- **Matching:** Users understand why notes matched (no confusion)

### Technical (Quantitative)
- **Note Creation:** <30 seconds from template to save
- **Property Editing:** Zero syntax errors with blocks
- **Local Matching:** <100ms to find matches in 1000 notes
- **Network Matching:** <3 seconds to query Nostr relays
- **Matching Accuracy:** 90% precision (no false positives)

### Adoption
- **Daily Active Notes:** 5+ notes created per user per week
- **P2P Publishing:** 30% of notes published publicly
- **Match Success:** 60% of published notes find at least 1 match
- **Contact Initiation:** 40% of matches result in contact attempt

---

## Future Phases (Post-Launch)

### Phase 6: Skills as Bridges (Optional)
*When P2P network has critical mass, enable Skills for legacy systems*

- Job boards (Indeed, LinkedIn) - until employers join Nostr
- GitHub integration - until devs coordinate natively
- E-commerce - until sellers publish offers directly

### Phase 7: Advanced Features (Power Users)
*After core is solid, enable advanced capabilities*

- Ontology customization
- Advanced search/filtering
- Data export/import
- API access

---

---

## UI/UX Flow Examples

### Flow 1: Creating First Note (New User)

See `ui_ux_flows.md` for complete interaction flows including:
- **New Note Creation** - Template selection → Property filling → Auto-save (30s total)
- **Property Block Editing** - Click → Edit → Save with visual feedback
- **Slash Command Palette** - Type `/` → Search → Insert property
- **Local Matching** - Auto-detect similar notes → Show comparison → Merge option
- **P2P Publishing** - Privacy confirmation → Network search → Match display → Contact initiation

Each flow includes:
- Visual state diagrams
- Animation timing specifications
- User feedback patterns
- Error handling scenarios

---

## Component Architecture

### File Structure
```
ui/src/components/
├── notes/
│   ├── NoteCreator.tsx          # Template selector + creation
│   ├── NoteEditor.tsx           # Main editing interface  
│   └── templates/               # Pre-defined templates
│       ├── JobOffer.ts
│       ├── JobRequest.ts
│       ├── Idea.ts
│       └── index.ts
├── properties/
│   ├── PropertyBlock.tsx        # ⭐ Visual property editor (NEW)
│   ├── PropertyPalette.tsx      # ⭐ Slash command palette (NEW)
│   ├── PropertyField.tsx        # Individual field components
│   ├── OperatorDropdown.tsx     # Operator selector
│   └── widgets/                 # ⭐ Type-specific widgets (NEW)
│       ├── CurrencyWidget.tsx   # $ + slider
│       ├── LocationWidget.tsx   # Geocoding + map
│       ├── DateWidget.tsx       # Calendar picker
│       ├── BooleanWidget.tsx    # Toggle switch
│       └── TextWidget.tsx       # Standard input
├── matching/
│   ├── MatchCard.tsx            # ⭐ Match result display (NEW)
│   ├── MatchComparison.tsx      # ⭐ Side-by-side comparison (NEW)
│   └── LocalMatchNotification.tsx # ⭐ Similarity alerts (NEW)
├── publish/
│   ├── PublishPanel.tsx         # ⭐ Enhanced privacy controls (NEW)
│   ├── PrivacyConfirmModal.tsx  # ✅ Already exists!
│   ├── RelaySelector.tsx        # Nostr relay picker
│   └── PublishProgress.tsx      # ⭐ Real-time progress (NEW)
└── common/
    ├── CommandPalette.tsx       # ⭐ Cmd+K palette (ENHANCE)
    ├── Slider.tsx               # ⭐ Reusable range slider (NEW)
    └── Toast.tsx                # ✅ Notification system exists
```

### Key Hooks
```
ui/src/hooks/
├── usePropertyEditor.ts         # ⭐ Property block state (NEW)
├── usePropertyPalette.ts        # ⭐ Slash command logic (NEW)
├── useLocalMatching.ts          # ⭐ Background match detection (NEW)
├── usePublishing.ts             # ⭐ Nostr publishing flow (NEW)
├── useKeyboardShortcuts.ts      # ⭐ Global keyboard handling (NEW)
└── useAutoSave.ts               # ⭐ Debounced save logic (NEW)
```

### Existing Code to Leverage
- ✅ `HybridEditor.tsx` - Base editor (extend with property blocks)
- ✅ `PropertyInspector.tsx` - Property viewing (make inline)
- ✅ `PrivacyConfirmModal.tsx` - Privacy confirmation (already exists!)
- ✅ `MapPickerModal.tsx` - Location picker (integrate into LocationWidget)
- ✅ `TimePickerModal.tsx` - Date/time picker (integrate into DateWidget)
- ✅ `SmartNoteAssistant.tsx` - AI suggestions (keep as optional)
- ✅ `index.css` - Base styling (property classes already defined!)

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Create `core/src/config/features.ts` - Feature flags
- [ ] Update `.env.local` - Set Skills/Agent/LLM to false
- [ ] Create `templates/JobOffer.ts`, `templates/JobRequest.ts`
- [ ] Build `NoteCreator.tsx` with template selector

### Week 2: Property Blocks
- [ ] Create `PropertyBlock.tsx` - View/edit modes
- [ ] Create `CurrencyWidget.tsx` - $ input + slider
- [ ] Create `LocationWidget.tsx` - Geocoding autocomplete
- [ ] Create `BooleanWidget.tsx` - Toggle switch
- [ ] Create `DateWidget.tsx` - Calendar picker
- [ ] Add `property-blocks.css` - Animations

### Week 3: Property Palette
- [ ] Create `PropertyPalette.tsx` - Slash command UI
- [ ] Integrate with `HybridEditor.tsx`
- [ ] Add keyboard shortcuts hook
- [ ] Test full note creation flow

### Week 4-5: Enhanced Matching
- [ ] Create `core/src/matching/semanticMatcher.ts`
- [ ] Implement `matchNotes()` with operator semantics
- [ ] Add `explainMatch()` and `explainConflict()`
- [ ] Unit tests for matching algorithm

### Week 6: Match Visualization
- [ ] Create `MatchCard.tsx` - WN matches displayed
- [ ] Create `MatchComparison.tsx` - Side-by-side
- [ ] Create `LocalMatchNotification.tsx` - Toast alerts
- [ ] Integration tests

### Week 7-8: Privacy & Publishing
- [ ] Create `PublishPanel.tsx` - Enhanced privacy UI
- [ ] Create `RelaySelector.tsx` - Nostr relay picker
- [ ] Create `PublishProgress.tsx` - Real-time status
- [ ] Enhance `PrivacyConfirmModal.tsx`

### Week 9: Network Discovery
- [ ] Create `core/src/nostr/discovery.ts`
- [ ] Implement `discoverMatches()` - Query relays
- [ ] Create `DMComposer.tsx` - Contact initiation
- [ ] End-to-end P2P test

### Week 10-11: Ergonomics
- [ ] Enhance `CommandPalette.tsx` - Add fuzzy search
- [ ] Create `useKeyboardShortcuts.ts`
- [ ] Add keyboard hint tooltips
- [ ] Create `Slider.tsx` - Reusable component
- [ ] Accessibility audit (ARIA labels, tab order)

### Week 12: Performance
- [ ] Implement `useAutoSave.ts` - Debounced saves
- [ ] Implement `useLocalMatching.ts` - Throttled matching
- [ ] Add memoization to heavy components
- [ ] Performance profiling (<100ms interactions)

### Week 13-14: Onboarding
- [ ] Create `OnboardingFlow.tsx` - 5-step tutorial
- [ ] Create `ExamplesLibrary.tsx` - Pre-made notes
- [ ] Add first-run detection
- [ ] User testing (5+ participants)

### Week 15: Launch Prep
- [ ] Documentation - README, user guide
- [ ] Video walkthrough - Screen recording
- [ ] Public beta deployment
- [ ] Metrics dashboard - Track adoption

---

## Testing Strategy

### Unit Tests
```bash
# Property blocks
npm test PropertyBlock.test.tsx
npm test CurrencyWidget.test.tsx
npm test LocationWidget.test.tsx

# Matching algorithm
npm test semanticMatcher.test.tsx
npm test operatorLogic.test.tsx
```

### Integration Tests
```bash
# Full note creation flow
npm test NoteCreation.integration.test.tsx

# Matching & publishing
npm test Matching.integration.test.tsx
npm test Publishing.integration.test.tsx
```

### E2E Tests (Playwright)
```bash
# User journeys
npx playwright test e2e/noteCreation.spec.ts
npx playwright test e2e/localMatching.spec.ts
npx playwright test e2e/p2pPublishing.spec.ts
```

---

## Design Tokens (CSS Variables)

```css
/* ui/src/index.css - Add to existing */
:root {
  /* Timing Functions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bounce: 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --transition-spring: 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  /* Property Block States */
  --property-bg: #374151;            /* gray-700 */
  --property-bg-hover: #4b5563;      /* gray-600 */
  --property-bg-editing: #1f2937;    /* gray-800 */
  --property-border-editing: #60a5fa; /* blue-400 */
  
  /* Property Syntax Colors (existing) */
  --property-key: #a5b4fc;           /* indigo-300 */
  --property-operator: #fca5a5;      /* red-300 */
  --property-value: #6ee7b7;         /* green-300 */
  
  /* Semantic Colors */
  --color-fact: #6ee7b7;             /* green-300 - 'is' facts */
  --color-constraint: #fbbf24;       /* amber-400 - '<, >' constraints */
  --color-proximity: #60a5fa;        /* blue-400 - 'near' location */
  
  /* Feedback Colors */
  --color-success: #10b981;          /* green-500 */
  --color-warning: #f59e0b;          /* amber-500 */
  --color-error: #ef4444;            /* red-500 */
  --color-info: #3b82f6;             /* blue-500 */
  
  /* Match Score Gradient */
  --match-high: #10b981;             /* green-500 - 80%+ */
  --match-medium: #f59e0b;           /* amber-500 - 50-80% */
  --match-low: #ef4444;              /* red-500 - <50% */
}
```

---

## Reference Documentation

### External Libraries
- **Geocoding:** OpenStreetMap Nominatim API (free, no API key)
- **Fuzzy Search:** Fuse.js (command palette)
- **Date Picker:** React DayPicker or existing TimePickerModal
- **Nostr:** nostr-tools (already integrated)
- **Storage:** LocalForage (already integrated)

### Design Inspiration
- **Notion:** Property blocks, slash commands, visual editing
- **VSCode:** Command palette, keyboard shortcuts
- **Raycast:** Instant feedback, smooth animations
- **Linear:** Keyboard-first navigation, polish
- **Superhuman:** Confidence through speed

### Performance Targets
- **Property blocks:** <100ms transition time
- **Local matching:** <100ms for 1000 notes
- **Network matching:** <3s Nostr query
- **Auto-save:** 500ms debounce
- **Slider:** 16ms (60fps) visual feedback

---

## Conclusion

**The Big Bet:** P2P semantic matching is superior to silo Skills.

**The Strategy:** Perfect the core before expanding.

**The Result:** A focused, polished tool that does one thing exceptionally well: enable people to find each other through semantic note matching.

**The Experience:** Every interaction feels smooth, confident, and delightful. Users understand the system through rich visual feedback, not documentation.

Skills, agents, and AI can come later. First, let's prove the core thesis works with a UI/UX that makes users feel like experts from their first note.
