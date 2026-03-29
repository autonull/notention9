/**
 * Capability-Based Security System
 *
 * Defines permission types and logic for checking note-based capabilities.
 *
 * Syntax: [@allow:<capability>:<scope>]
 * Example: [@allow:browser:navigate:indeed.com]
 */

import { Property } from '../types/index.js';

export type CapabilityType =
    | 'browser:navigate'
    | 'browser:screenshot'
    | 'browser:scrape'
    | 'browser:interact' // click, type, fill
    | 'network:fetch'
    | 'filesystem:read'
    | 'filesystem:write'
    | 'system:exec';

export interface Permission {
    type: CapabilityType;
    scope: string; // domain, path, or '*'
    grantedAt: number;
    sourceNoteId?: string;
}

export class CapabilityManager {
    private permissions: Permission[] = [];

    /**
     * Parse permissions from a Note's properties or tags
     */
    extractPermissions(noteProperties: Property[]): Permission[] {
        const permissions: Permission[] = [];

        // Look for properties like [allow:browser:navigate:indeed.com]
        // Note: Property format is key:operator:value.
        // We might use a special key 'allow' or 'capability'.
        // Let's support: [allow:browser:navigate:indeed.com] -> key='allow', operator='browser:navigate', value='indeed.com'
        // Or better: [capability:grant:browser:navigate:indeed.com]

        // Let's stick to the simpler format proposed in ROADMAP:
        // [@allow:browser:navigate:indeed.com] which might be parsed as a tag or property.
        // If it's a property: key='allow', operator='browser:navigate', value='indeed.com' is a bit weird for operator.

        // Let's use standard property: [permission:grant:browser:navigate:indeed.com]
        // key: permission
        // operator: grant
        // values: ['browser:navigate', 'indeed.com']

        for (const prop of noteProperties) {
            if (prop.key === 'permission' && prop.operator === 'grant') {
                if (prop.values.length >= 2) {
                    const type = prop.values[0] as CapabilityType;
                    const scope = prop.values[1];

                    if (this.isValidCapability(type)) {
                        permissions.push({
                            type,
                            scope,
                            grantedAt: Date.now()
                        });
                    }
                }
            }

            // Also support legacy/roadmap style: [allow:browser:navigate:indeed.com]
            // If parsed as property: key='allow', values=['browser:navigate', 'indeed.com']
            if (prop.key === 'allow') {
                 // values[0] = 'browser:navigate:indeed.com' ?? No, parser splits by colon?
                 // If property parser handles [key:op:val], then [allow:browser:navigate:indeed.com]
                 // might be key='allow', op='browser', val='navigate:indeed.com' ?
                 // Ideally we want explicit structure.

                 // Let's assume the property extractor handles it.
                 // If we find key='allow', we check values.
                 if (prop.values.length > 0) {
                     // Try to parse "browser:navigate:indeed.com"
                     const parts = prop.values[0].split(':');
                     if (parts.length >= 2) {
                         const type = `${parts[0]}:${parts[1]}` as CapabilityType;
                         const scope = parts.slice(2).join(':'); // rest is scope

                         if (this.isValidCapability(type)) {
                             permissions.push({
                                 type,
                                 scope: scope || '*',
                                 grantedAt: Date.now()
                             });
                         }
                     }
                 }
            }
        }

        return permissions;
    }

    /**
     * Check if a specific action is allowed by the provided permissions
     */
    checkPermission(
        requiredCapability: CapabilityType,
        requiredScope: string,
        permissions: Permission[]
    ): boolean {
        for (const perm of permissions) {
            if (perm.type === requiredCapability) {
                if (this.matchScope(perm.scope, requiredScope)) {
                    return true;
                }
            }

            // Handle wildcard capability (e.g. 'browser:*')
            const [permDomain] = perm.type.split(':');
            const [reqDomain] = requiredCapability.split(':');

            if (permDomain === reqDomain && perm.type.endsWith(':*')) {
                 if (this.matchScope(perm.scope, requiredScope)) {
                    return true;
                }
            }
        }
        return false;
    }

    private matchScope(granted: string, requested: string): boolean {
        if (granted === '*') return true;
        if (granted === requested) return true;

        // Domain wildcard: *.indeed.com matches www.indeed.com
        if (granted.startsWith('*.')) {
            const domain = granted.substring(2);
            return requested.endsWith(domain);
        }

        // Path checking could go here

        return false;
    }

    private isValidCapability(type: string): boolean {
        const validPrefixes = ['browser:', 'network:', 'filesystem:', 'system:'];
        return validPrefixes.some(prefix => type.startsWith(prefix));
    }
}
