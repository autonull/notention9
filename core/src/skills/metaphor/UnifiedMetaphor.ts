import { UIMetaphor, MetaphorProperty } from '../../types/metaphor.js';

/**
 * Extended metaphor definition with optional UI rendering info
 * This is the single source of truth for metaphor definitions
 * 
 * @example
 * ```typescript
 * const myMetaphor: UnifiedMetaphor = {
 *   id: 'my-metaphor',
 *   name: 'My Metaphor',
 *   description: 'Does something',
 *   icon: '🎯',
 *   color: '#3b82f6',
 *   category: 'automation',
 *   template: '[trigger] [action]',
 *   properties: [...],
 *   // Optional UI rendering
 *   uiView: MyReactComponent,
 *   uiPreview: MyPreviewComponent
 * };
 * ```
 */
export interface UnifiedMetaphor extends UIMetaphor {
    /** Optional React component for rendering this metaphor in UI */
    uiView?: React.ComponentType<{ note: any; metaphor?: UnifiedMetaphor }>;
    
    /** Optional React component for preview/editor */
    uiPreview?: React.ComponentType<{ metaphor: UnifiedMetaphor; onChange: (props: Partial<UnifiedMetaphor>) => void }>;
    
    /** Default property values for UI form */
    uiDefaults?: Record<string, any>;
    
    /** Validation function for UI form */
    uiValidate?: (props: Record<string, any>) => string[]; // Returns error messages
}

/**
 * Type for React component (avoids direct React import in core)
 */
export type ReactComponentType<P = any> = any;

/**
 * Convert UnifiedMetaphor to UIMetaphor (strips UI-specific fields)
 */
export function toUIMetaphor(unified: UnifiedMetaphor): UIMetaphor {
    const { uiView, uiPreview, uiDefaults, uiValidate, ...core } = unified;
    return core;
}

/**
 * Create a UnifiedMetaphor from core definition + UI components
 */
export function createUnifiedMetaphor(
    core: UIMetaphor,
    ui?: {
        uiView?: UnifiedMetaphor['uiView'];
        uiPreview?: UnifiedMetaphor['uiPreview'];
        uiDefaults?: UnifiedMetaphor['uiDefaults'];
        uiValidate?: UnifiedMetaphor['uiValidate'];
    }
): UnifiedMetaphor {
    return {
        ...core,
        ...ui
    };
}

/**
 * Metaphor with UI registration bundled together
 */
export interface MetaphorBundle {
    metaphor: UnifiedMetaphor;
    /** Register this metaphor in both core registry and UI plugin */
    register: (coreRegistry: any, uiPlugin: any) => void;
}

/**
 * Create a metaphor bundle that registers in both core and UI
 */
export function createMetaphorBundle(metaphor: UnifiedMetaphor): MetaphorBundle {
    return {
        metaphor,
        register(coreRegistry: any, uiPlugin: any) {
            // Register in core
            coreRegistry.registerMetaphor(toUIMetaphor(metaphor));
            
            // Register in UI if view provided
            if (metaphor.uiView && uiPlugin) {
                uiPlugin.registerView(metaphor.id, metaphor.uiView);
            }
        }
    };
}

/**
 * Validation helper for metaphor properties
 */
export function validateMetaphorProperties(
    metaphor: UnifiedMetaphor,
    values: Record<string, any>
): string[] {
    const errors: string[] = [];
    
    for (const prop of metaphor.properties) {
        const value = values[prop.name];
        
        if (prop.required && (value === undefined || value === null || value === '')) {
            errors.push(`${prop.label} is required`);
            continue;
        }
        
        if (value !== undefined && value !== null && value !== '') {
            // Type validation
            switch (prop.type) {
                case 'number':
                    if (typeof value !== 'number' && isNaN(Number(value))) {
                        errors.push(`${prop.label} must be a number`);
                    }
                    break;
                case 'boolean':
                    if (typeof value !== 'boolean') {
                        errors.push(`${prop.label} must be a boolean`);
                    }
                    break;
                case 'enum':
                    if (prop.options && !prop.options.includes(value)) {
                        errors.push(`${prop.label} must be one of: ${prop.options.join(', ')}`);
                    }
                    break;
            }
        }
    }
    
    // Custom validation
    if (metaphor.uiValidate) {
        errors.push(...metaphor.uiValidate(values));
    }
    
    return errors;
}