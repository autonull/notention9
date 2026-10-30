// Seam roles - stable identifiers that map to discovered seam IDs at runtime
// Discovered seam IDs have format: {role}-{index} (e.g., capture-20, elicit-1)
export const SEAM_ROLES = {
    CAPTURE: 'capture',
    ELICIT: 'elicit',
    MATCH: 'match',
    DISPLAY: 'display',
    LAYOUT: 'layout',
    ONTOLOGY: 'ontology',
    INTENT: 'intent',
} as const;

export type SeamRole = typeof SEAM_ROLES[keyof typeof SEAM_ROLES];

/**
 * Resolve a full discovered seam ID from a role.
 * Falls back to the role name if no discovered seam exists for that role.
 */
export function resolveSeamId(role: SeamRole, strategyRegistry?: { listSeams(): Array<{ id: string }> }): string {
    if (!strategyRegistry) return role;
    
    const seams = strategyRegistry.listSeams();
    const discovered = seams.find(s => s.id.startsWith(`${role}-`));
    return discovered?.id ?? role;
}

/**
 * Get all discovered seam IDs for a role.
 */
export function getSeamIdsForRole(role: SeamRole, strategyRegistry?: { listSeams(): Array<{ id: string }> }): string[] {
    if (!strategyRegistry) return [role];
    
    const seams = strategyRegistry.listSeams();
    return seams.filter(s => s.id.startsWith(`${role}-`)).map(s => s.id);
}