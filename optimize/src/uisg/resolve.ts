import type { UisgSurface, SurfaceVariant } from './types.js';
import type { SeamRole, ParamDef } from '@notention/core/ui/strategy';

export interface ResolvedSurface extends UisgSurface {
    _resolvedVariant?: string;
    strategyOverrides?: Partial<Record<SeamRole, string>>;
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (value !== undefined) {
            if (
                typeof value === 'object' &&
                value !== null &&
                !Array.isArray(value) &&
                typeof result[key] === 'object' &&
                result[key] !== null &&
                !Array.isArray(result[key])
            ) {
                result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
            } else {
                result[key] = value;
            }
        }
    }
    return result;
}

export function resolveSurface(surface: UisgSurface, variantId?: string): ResolvedSurface {
    const resolved = { ...surface } as ResolvedSurface;
    const variantKey = variantId ?? surface.defaultVariant;

    if (!variantKey || !surface.variants?.[variantKey]) {
        return resolved;
    }

    const variant = surface.variants[variantKey] as SurfaceVariant;
    resolved._resolvedVariant = variantKey;

    if (variant.template) {
        resolved.template = variant.template;
    }

    if (variant.propsSchema) {
        resolved.propsSchema = deepMerge(resolved.propsSchema ?? {}, variant.propsSchema) as Record<string, ParamDef>;
    }

    if (variant.strategyOverrides) {
        const baseOverrides = (resolved as UisgSurface & { strategyOverrides?: Partial<Record<SeamRole, string>> }).strategyOverrides ?? {};
        resolved.strategyOverrides = deepMerge(baseOverrides, variant.strategyOverrides) as Partial<Record<SeamRole, string>>;
    }

    return resolved;
}

export function getAvailableVariants(surface: UisgSurface): string[] {
    return surface.variants ? Object.keys(surface.variants) : [];
}

export function hasVariant(surface: UisgSurface, variantId: string): boolean {
    return Boolean(surface.variants?.[variantId]);
}

export function getDefaultVariant(surface: UisgSurface): string | undefined {
    return surface.defaultVariant;
}