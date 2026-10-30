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