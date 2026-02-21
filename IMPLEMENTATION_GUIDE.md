# Implementation Guide

This document provides specific file references, algorithms, and step-by-step instructions for implementing each phase of the roadmap.

## Phase 1: Semantic Engine

### 1.1 Enhanced Matching Engine

**Files to modify:**
- `core/src/matching/MatchingService.ts` (existing matching logic)
- `core/src/matching/MatchEngine.ts` (high-level matching API)

**Current state:**
- ✅ Basic constraint checking (`is`, `<`, `>`, `contains`)
- ✅ Levenshtein fuzzy matching (lines 38-69)
- ✅ Priority weighting (lines 114-117)
- ❌ No indexing (O(n) scans)
- ❌ No partial scoring explanation
- ❌ No range matching (`[budget:100-500]`)

**Implementation steps:**

1. **Add range operator support** (`parsing.ts` line 71):
   ```typescript
   // Add to word operators regex
   const wordOpRegex = /^([^\s]+)\s+(is|contains|between|...|range)\s+(.+)$/;
   ```

2. **Implement property indexing** (new file `core/src/matching/PropertyIndex.ts`):
   ```typescript
   class PropertyIndex {
     private keyIndex: Map<string, Set<string>>; // key -> noteIds
     
     rebuild(notes: Note[]) {
       // Build Map: property key -> Set of note IDs
     }
     
     getCandidates(constraints: Property[]): Set<string> {
       // Return intersection of noteIds for all constraint keys
       // Reduces search space from N to ~N/10
     }
   }
   ```

3. **Add match explanation** (`MatchingService.ts` line 119):
   ```typescript
   return {
     score: weightedScore,
     satisfied,
     failed,
     explanation: `Matched ${satisfied.length}/${constraints.length}. Missing: ${failed.map(f => f.key).join(', ')}`
   };
   ```

**Testing:**
```bash
npm test core/src/__tests__/matching.test.ts
```

---

### 1.2 Property System Enhancement

**Files to modify:**
- `core/src/parsing.ts` (property parsing - 6 strategies, lines 30-142)

**Current state:**
- ✅ Multi-format parsing (`[key:op:val]`, `[key op val]`)
- ✅ Symbolic operators (`<`, `>`, `=`)
- ❌ No multi-value support
- ❌ No nested properties
- ❌ No units

**Implementation steps:**

1. **Multi-value properties** (modify `parsePropertyBlock`, line 147):
   ```typescript
   // Already splits on comma (line 44)
   // Just document that [skills:is:react,vue] works
   ```

2. **Add nested property support** (new parser):
   ```typescript
   {
     name: 'Nested Properties',
     parse: (content) => {
       const match = content.match(/^([a-z.]+):(.+):(.+)$/);
       if (!match || !match[1].includes('.')) return null;
       return {
         key: match[1], // e.g., "location.city"
         operator: match[2],
         values: match[3].split(',').map(v => v.trim())
       };
     }
   }
   ```

3. **Add property aliases** (new file `core/src/propertyAliases.ts`):
   ```typescript
   export const ALIASES: Record<string, string> = {
     'loc': 'location',
     '$': 'price',
     '💰': 'price'
   };
   
   export function resolveAlias(key: string): string {
     return ALIASES[key.toLowerCase()] || key;
   }
   ```

**Testing:**
```bash
npm test core/src/__tests__/parsing.test.ts
```

---

### 1.3 Ontology Evolution

**Files to modify:**
- `core/src/ontologyService.ts` (existing ontology logic)
- New: `ui/src/components/developer/OntologyGraph.tsx`

**Implementation steps:**

1. **Track usage frequency** (add to `ontologyService.ts`):
   ```typescript
   private usageStats = new Map<string, number>();
   
   recordPropertyUsage(key: string) {
     this.usageStats.set(key, (this.usageStats.get(key) || 0) + 1);
   }
   ```

2. **Type inference** (add to ontology):
   ```typescript
   inferType(key: string, values: (string|number)[]): string {
     const numericCount = values.filter(v => typeof v === 'number' || !isNaN(Number(v))).length;
     return numericCount > values.length / 2 ? 'number' : 'string';
   }
   ```

3. **Visualization** (use existing D3 in UI):
   - Use `react-force-graph` or `react-d3-graph`
   - Nodes = property keys
   - Edges = co-occurrence frequency
   - Size = usage count

**Library:**
```bash
npm install --workspace=ui react-force-graph
```

---

## Phase 2: P2P Coordination

### 2.1 Nostr Publishing & Discovery

**Files to modify:**
- `core/src/nostr.ts` (existing publishing logic)
- `core/src/nostr/discovery.ts` (existing matching over Nostr)

**Current state:**
- ✅ Basic publishing (lines 94-165)
- ✅ Property tags (line 113)
- ❌ No semantic event kinds
- ❌ No privacy modes

**Implementation steps:**

1. **Define custom event kind** (`nostr.ts` line 117):
   ```typescript
   const kind = 35000; // Custom: Semantic Note
   // Standard NIP-01 kinds: 1 = text note, 30000+ = parameterized replaceable
   ```

2. **Privacy modes** (new file `core/src/nostr/privacy.ts`):
   ```typescript
   export async function publishHashed(note: Note) {
     const tags = note.properties.map(p => [
       'property-hash',
       p.key,
       sha256(p.values.join(','))
     ]);
     // Publish with hashed values instead of plaintext
   }
   ```

3. **Smart subscription filters** (`nostr/discovery.ts`):
   ```typescript
   const filters = {
     kinds: [35000],
     '#property': requestNote.properties.map(p => `${p.key}:*`)
   };
   // Only subscribe to events with relevant property keys
   ```

**Testing:**
```bash
# Start local relay
docker run -p 7777:8080 scsibug/nostr-rs-relay

# Test publishing
npm test core/src/__tests__/nostr.test.ts
```

---

## Phase 3: Tool Architecture

### 3.1 MCP Tool Registry

**Files to create:**
- `agent/src/server/McpToolRegistry.ts`

**Pattern:**
```typescript
export class McpToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  
  register(name: string, def: {
    description: string;
    schema: z.ZodSchema;
    handler: (args: any) => Promise<any>;
    category?: string;
  }) {
    this.tools.set(name, { ...def, name });
  }
  
  async execute(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    
    try {
      const validated = tool.schema.parse(args);
      const result = await tool.handler(validated);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: 'text', text: e.message }]
      };
    }
  }
}
```

**Migration:**
Replace `register` helper in `McpServer.ts` and `SimulationMcpServer.ts` with shared registry.

---

## Key Libraries & Tools

**Already in use:**
- `nostr-tools` - Nostr protocol
- `zod` - Schema validation
- `@ai-sdk/openai` - LLM integration
- `@modelcontextprotocol/sdk` - MCP

**Recommended additions:**
- `react-force-graph` - Ontology visualization
- `crypto` (Node.js built-in) - Hashing for privacy
- `lru-cache` - Caching for performance
- `nostream` or `strfry` - Local Nostr relay for testing

---

## Testing Strategy

**Unit tests:**
```bash
npm test                          # All tests
npm test matching.test.ts         # Specific file
npm test -- --watch               # Watch mode
```

**Integration tests:**
```bash
npx tsx verification/verify_cli_mcp.ts          # CLI/MCP integration
npx playwright test                              # UI tests (if configured)
```

**Performance benchmarks:**
```bash
npx tsx benchmarks/matching_performance.ts      # Create this
```

---

## Development Workflow

**Starting a new feature:**
1. Create branch: `git checkout -b feature/advanced-matching`
2. Write failing test first
3. Implement feature
4. Run tests: `npm test`
5. Update TODO.md task checklist

**Code style:**
- Follow patterns in existing files
- Use JSDoc comments for public APIs
- Export singletons where appropriate (`matchingService`)
- Prefer functional patterns over classes where simple

---

*This guide is a living document. Add details as you implement.*
