import { readFile } from 'fs/promises';
import Ajv from 'ajv';

let cachedSchema: any = null;

export async function loadSchema(): Promise<any> {
    if (cachedSchema) return cachedSchema;
    const schemaText = await readFile('loop/schema.json', 'utf-8');
    cachedSchema = JSON.parse(schemaText);
    return cachedSchema;
}

export async function validateLoopConfig(config: any): Promise<void> {
    const schema = await loadSchema();
    const ajv = new (Ajv.default || Ajv)({ allErrors: true, strict: false });
    const validate = ajv.compile({
        ...schema.definitions.loopConfig,
        definitions: schema.definitions,
    });
    const valid = validate(config);
    if (!valid) {
        throw new Error(`Loop config validation failed: ${JSON.stringify(validate.errors, null, 2)}`);
    }
}

export async function loadLoopConfig(path: string): Promise<any> {
    const configText = await readFile(path, 'utf-8');
    return JSON.parse(configText);
}