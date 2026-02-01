export type Capability =
  | 'browser:navigate'
  | 'browser:fill'
  | 'network:fetch'
  | 'fs:read'
  | 'fs:write';

export interface PermissionRequest {
  skillId: string;
  capability: Capability;
  target?: string; // e.g., 'indeed.com' or '/home/user'
}

export class CapabilityManager {
  /**
   * Check if a skill has permission to perform an action.
   * This implements the "Capability-Based Security" from Phase 2.5/5.
   */
  async checkPermission(request: PermissionRequest): Promise<boolean> {
    // Stub logic:
    // 1. Load permissions from Note store (via ConfigProcessor or dedicated PermissionStore)
    // 2. Check for explicit grants
    // 3. Check for denials

    // Default to strict deny for network/fs
    if (request.capability.startsWith('network') || request.capability.startsWith('fs')) {
        console.warn(`[Security] Blocked ${request.skillId} from ${request.capability} on ${request.target}`);
        return false;
    }

    return true; // Allow browser actions for now in dev/test
  }
}
