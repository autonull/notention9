import fs from 'fs';
import path from 'path';
import { log } from './utils.js';
import { ToolDefinition } from './llm.js';

export class SystemPromptBuilder {
    private customPrompt: string | null = null;

    constructor() {
        this.loadCustomPrompt();
    }

    private loadCustomPrompt() {
        const potentialPaths = [
            path.join(process.cwd(), 'config', 'system_prompt.md'),
            path.join(process.cwd(), 'system_prompt.md')
        ];

        for (const p of potentialPaths) {
            if (fs.existsSync(p)) {
                try {
                    this.customPrompt = fs.readFileSync(p, 'utf-8');
                    log.info(`Loaded custom system prompt from ${p}`);
                    break;
                } catch (e) {
                    log.error(`Failed to read system prompt file: ${e}`);
                }
            }
        }
    }

    public build(
        capabilities: any | null,
        ontologyCache: string | null,
        tools: ToolDefinition[],
        activeContext: { id: string, title: string } | null = null
    ): string {
        const basePrompt = this.customPrompt || `
You are the "Notention Agent", a helpful AI assistant that controls a Notention profile.
Your goal is to help the user manage their knowledge graph (notes) and execute skills.
`;

        const contextSection = activeContext
            ? `\nActive Context:\nThe user is currently focused on the note: "${activeContext.title}" (ID: ${activeContext.id}). Assume all commands apply to this note unless specified otherwise.\n`
            : '';

        let capabilitiesSection = `
Capabilities:
- Manage Notes: Create, Read (Search), Update, Delete.
- Execute Skills: Trigger agent skills based on note content.
- Query Ontology: Understand the semantic structure of the knowledge base.
- Local Files: Access and ingest files from the local filesystem.
- Semantic Extraction: Use 'extract_semantics' to understand the properties of a note text.
`;

        if (capabilities) {
            capabilitiesSection += `
System Flags:
- Browser: ${capabilities.browser ? 'ENABLED' : 'DISABLED'}
- Files: ${capabilities.files ? 'ENABLED' : 'DISABLED'}
- API: ${capabilities.api ? 'ENABLED' : 'DISABLED'}
`;
        }

        return `
${basePrompt}
${contextSection}
${capabilitiesSection}

Ontology Context:
${ontologyCache || "Ontology loading..."}

Semantic Properties:
Notention uses a semantic property system. Prefer using the 'properties' field.
Syntax: [key:operator:values]
- key: From ontology (e.g., 'type', 'priority', 'status')
- operator: 'is' (equality), '>' (greater), '<' (less), 'contains'
- values: Comma-separated list (e.g., 'task', 'high', 'active')

Guidelines:
- Use 'search_notes' to find items.
- Use 'read_notes' for broad listing.
- Use 'create_note' with semantic tags.
- Use 'update_note' after finding ID.
- Be concise. Summarize actions.

Available Tools:
${JSON.stringify(tools, null, 2)}

Output Format:
- Speak directly to the user (Markdown supported).
- Call tools using JSON blocks:
\`\`\`json
{ "tool": "tool_name", "args": { ... } }
\`\`\`
`;
    }
}
