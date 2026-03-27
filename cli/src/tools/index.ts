import { CliClient } from '../client.js';
import { LocalTool } from '../llm.js';
import { fsTools } from './fs.js';
import { shellTools } from './shell.js';
import { createIngestTools } from './ingest.js';

export function getLocalTools(cli: CliClient): LocalTool[] {
    return [
        ...fsTools,
        ...shellTools,
        ...createIngestTools(cli)
    ];
}
