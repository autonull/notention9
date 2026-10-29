import { readFile } from 'fs/promises';
import Ajv from 'ajv';

let cachedSchema: any = null;

async function loadSchema(): Promise<any> {
    if (cachedSchema) return cachedSchema;
    const schemaText = await readFile('loop/schema.json', 'utf-8');
    cachedSchema = JSON.parse(schemaText);
    return cachedSchema;
}

export async function validateTaxonomy(taxonomy: any): Promise<void> {
    const schema = await loadSchema();
    const ajv = new (Ajv.default || Ajv)({ allErrors: true, strict: false });
    const validate = ajv.compile({
        ...schema.definitions.taxonomy,
        definitions: schema.definitions,
    });
    const valid = validate(taxonomy);
    if (!valid) {
        throw new Error(`Taxonomy validation failed: ${JSON.stringify(validate.errors, null, 2)}`);
    }
}

export async function loadTaxonomy(path: string): Promise<any> {
    const taxonomyText = await readFile(path, 'utf-8');
    return JSON.parse(taxonomyText);
}