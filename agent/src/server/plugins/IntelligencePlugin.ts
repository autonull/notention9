import { z } from 'zod';
import { McpToolRegistry } from '../McpToolRegistry.js';
import { AgentPlugin } from '../AgentPlugin.js';
import { LlmPropertyExtractor } from '../../intelligence/LlmPropertyExtractor.js';

export class IntelligencePlugin implements AgentPlugin {
    name = 'intelligence';
    version = '1.0.0';
    private extractor = new LlmPropertyExtractor();

    async initialize(registry: McpToolRegistry): Promise<void> {
        registry.register('extract_semantics', {
            description: 'Extract semantic properties from text using an LLM',
            schema: z.object({
                text: z.string()
            }),
            handler: async ({ text }) => {
                const properties = await this.extractor.extract(text);
                return {
                    properties,
                    count: properties.length
                };
            }
        });
    }
}
