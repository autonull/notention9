# Using Notention as a Git Dependency

Install the monorepo directly from GitHub and import sub-packages via subpath exports.

## Installation

```bash
# Latest main branch (default)
npm install github:automenta/notention9

# Or pin to a specific tag/commit
npm install github:automenta/notention9#v1.0.0
npm install github:automenta/notention9#abc1234
```

The installed package name is `notention` (from the root `package.json` `name` field), so imports use `notention/*` regardless of the GitHub repo name.

> **Note:** There is no `latest` tag on GitHub. Installing without a `#ref` always gets the default branch (main), which is the latest development version. For a stable release, use a version tag like `#v1.0.0`.

This clones the repo, installs workspace dependencies via npm workspaces, and runs the `prepare` script (which builds all packages).

## Importing Sub-Packages

The root `package.json` exposes these entry points:

| Subpath | Resolves To |
|---------|-------------|
| `notention` | `@notention/core` (default) |
| `notention/core` | `@notention/core` |
| `notention/agent` | `@notention/agent` |
| `notention/cli` | `@notention/cli` |
| `notention/optimize` | `@notention/optimize` |
| `notention/simulator` | `@notention/simulator` |
| `notention/eval` | `@notention/eval` |
| `notention/conformance` | `@notention/conformance` |

### JavaScript / Node.js (ESM)

```javascript
// Core types, utilities, storage, matching, etc.
import {
  EventSchemaRegistry,
  MatchingService,
  JsonStore,
  Ledger,
  DEFAULT_ONTOLOGY
} from 'notention/core';

// Agent server
import { AgentServer } from 'notention/agent';

// Simulator for testing
import { ScenarioRunner, MovieMaker, generateScenario } from 'notention/simulator';

// Conformance test suite
import { RegressionScenario } from 'notention/conformance';

// CLI (side-effect import starts embedded server)
import 'notention/cli';
```

### TypeScript

Type declarations are included. No extra config needed if your `tsconfig.json` has `"moduleResolution": "bundler"` or `"node16"`/`"nodenext"`.

```typescript
import type { Note, Ontology } from 'notention/core';
import type { AgentServer } from 'notention/agent';
import type { SimulationConfig } from 'notention/simulator';
```

## What Gets Installed

```
node_modules/notention/
├── package.json          # Root manifest with exports map
├── core/dist/            # Built core package
│   ├── index.node.js     # Node.js entry (main export)
│   ├── index.d.ts        # Type declarations
│   └── browser/          # Browser builds
├── agent/dist/
│   ├── index.js
│   └── index.d.ts
├── cli/dist/
│   └── index.js
├── optimize/dist/
│   └── index.js
├── simulator/dist/
│   ├── index.js
│   └── index.d.ts
├── ui/eval/dist/
│   └── index.js
└── packages/conformance/dist/
    └── index.js
```

## Requirements

- Node.js ≥ 20 (uses `exports` field, ESM, `import.meta.resolve`)
- npm ≥ 9 (npm workspaces used for monorepo; `prepare` script runs `npm run build --workspaces`)

## Troubleshooting

### Types not found
Ensure `moduleResolution` is set to `bundler`, `node16`, or `nodenext` in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

### Build fails on install
The `prepare` script runs `npm run build --workspaces`. If it fails, check that all workspace packages have a `build` script. You can also build manually:

```bash
cd node_modules/notention
npm run build
```

### Subpath not exported
Only the entry points listed above are exported. Internal modules (e.g., `notention/core/storage`) are not public—import from the root subpath and destructure:

```javascript
// ❌ Won't work
import { JsonStore } from 'notention/core/storage';

// ✅ Works
import { JsonStore } from 'notention/core';
```

## Updating

```bash
# Update to latest main
npm update notention

# Or reinstall at a new ref
npm uninstall notention
npm install github:automenta/notention9#new-tag
```