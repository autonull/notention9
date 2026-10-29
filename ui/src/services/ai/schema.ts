import {z} from 'zod';

export const PropertySchema = z.object({
    key: z.string().min(1),
    operator: z.enum(['is', 'is not', 'contains', 'greater than', 'less than']),
    values: z.array(z.string().min(1)).min(1),
});

export const TagSchema = z.array(z.string().min(1)).max(20);

export const InferredAttributeSchema = z.object({
    key: z.string().min(1),
    type: z.enum(['string', 'number', 'date', 'enum', 'geo']),
    description: z.string().optional(),
    usageCount: z.number().int().min(0).default(0),
    sampleValues: z.array(z.string()).default([]),
});

export const OntologyOptimizationSchema = z.object({
    merged: z.array(z.object({
        source: z.string().min(1),
        target: z.string().min(1),
    })),
    pruned: z.array(z.string().min(1)),
});

export type Property = z.infer<typeof PropertySchema>;
export type Tag = z.infer<typeof TagSchema>;
export type InferredAttribute = z.infer<typeof InferredAttributeSchema>;
export type OntologyOptimization = z.infer<typeof OntologyOptimizationSchema>;

export interface ValidationResult<T> {
    success: boolean;
    data: T | null;
    errors: string[];
    repaired: boolean;
}

export function validateAndRepair<T>(
    raw: unknown,
    schema: z.ZodSchema<T>,
    repairFn?: (raw: unknown) => unknown
): ValidationResult<T> {
    const result = schema.safeParse(raw);

    if (result.success) {
        return {
            success: true,
            data: result.data,
            errors: [],
            repaired: false,
        };
    }

    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);

    if (repairFn) {
        try {
            const repaired = repairFn(raw);
            const repairedResult = schema.safeParse(repaired);
            if (repairedResult.success) {
                return {
                    success: true,
                    data: repairedResult.data,
                    errors: [...errors, 'Repaired'],
                    repaired: true,
                };
            }
        } catch {
            // Repair failed
        }
    }

    return {
        success: false,
        data: null,
        errors,
        repaired: false,
    };
}

export function repairJsonFence(text: string): string {
    if (!text || typeof text !== 'string') return '[]';
    const trimmed = text.trim();
    if (trimmed.startsWith('```json')) {
        return trimmed.slice(7, -3).trim();
    }
    if (trimmed.startsWith('```')) {
        return trimmed.slice(3, -3).trim();
    }
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        return trimmed;
    }
    const jsonMatch = trimmed.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    return jsonMatch ? jsonMatch[1] : '[]';
}

export function repairPropertyArray(raw: unknown): Property[] {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const cleaned = repairJsonFence(text);

    try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter(item => item && typeof item === 'object')
            .map(item => ({
                key: String(item.key || '').trim(),
                operator: ['is', 'is not', 'contains', 'greater than', 'less than'].includes(item.operator)
                    ? item.operator
                    : 'is',
                values: Array.isArray(item.values)
                    ? item.values.map(v => String(v).trim()).filter(Boolean)
                    : [String(item.value || item.values || '').trim()].filter(Boolean),
            }))
            .filter(p => p.key && p.values.length > 0);
    } catch {
        return [];
    }
}

export function repairTagArray(raw: unknown): string[] {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const cleaned = repairJsonFence(text);

    try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(t => String(t).trim().toLowerCase())
            .filter(t => t.length > 0 && t.length <= 50)
            .slice(0, 20);
    } catch {
        return [];
    }
}

export function repairInferredAttributes(raw: unknown): InferredAttribute[] {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const cleaned = repairJsonFence(text);

    try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter(item => item && typeof item === 'object' && item.key)
            .map(item => ({
                key: String(item.key).trim(),
                type: ['string', 'number', 'date', 'enum', 'geo'].includes(item.type)
                    ? item.type
                    : 'string',
                description: item.description ? String(item.description).trim() : undefined,
                usageCount: typeof item.usageCount === 'number' && !isNaN(item.usageCount)
                    ? Math.max(0, Math.floor(item.usageCount))
                    : 0,
                sampleValues: Array.isArray(item.sampleValues)
                    ? item.sampleValues.map(v => String(v).trim()).filter(Boolean).slice(0, 5)
                    : [],
            }))
            .filter(a => a.key);
    } catch {
        return [];
    }
}

export function repairOntologyOptimization(raw: unknown): OntologyOptimization {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const cleaned = repairJsonFence(text);

    try {
        const parsed = JSON.parse(cleaned);
        return {
            merged: Array.isArray(parsed.merged)
                ? parsed.merged
                    .filter(m => m && typeof m === 'object' && m.source && m.target)
                    .map(m => ({source: String(m.source).trim(), target: String(m.target).trim()}))
                : [],
            pruned: Array.isArray(parsed.pruned)
                ? parsed.pruned.map(p => String(p).trim()).filter(Boolean)
                : [],
        };
    } catch {
        return {merged: [], pruned: []};
    }
}