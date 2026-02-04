import { CapabilityManager } from '../core/src/security/CapabilityManager.js';
import { Property } from '../core/src/types/index.js';

console.log('🧪 Verifying CapabilityManager...');

const manager = new CapabilityManager();

// Test 1: Extract permission from property
const props1: Property[] = [
    { key: 'permission', operator: 'grant', values: ['browser:navigate', 'indeed.com'] }
];
const perms1 = manager.extractPermissions(props1);

if (perms1.length === 1 && perms1[0].type === 'browser:navigate' && perms1[0].scope === 'indeed.com') {
    console.log('✅ Test 1: Extract explicit permission success');
} else {
    console.error('❌ Test 1: Extract explicit permission failed', perms1);
    process.exit(1);
}

// Test 2: Check permission logic
const hasPerm = manager.checkPermission('browser:navigate', 'indeed.com', perms1);
if (hasPerm) {
    console.log('✅ Test 2: Check permission success');
} else {
    console.error('❌ Test 2: Check permission failed');
    process.exit(1);
}

// Test 3: Check failure on mismatch scope
const hasPerm2 = manager.checkPermission('browser:navigate', 'google.com', perms1);
if (!hasPerm2) {
    console.log('✅ Test 3: Check permission denial success');
} else {
    console.error('❌ Test 3: Check permission denial failed (allowed restricted scope)');
    process.exit(1);
}

// Test 4: Wildcard scope
const props2: Property[] = [
    { key: 'allow', operator: 'is', values: ['browser:navigate:*.google.com'] }
];
const perms2 = manager.extractPermissions(props2);
const hasPerm3 = manager.checkPermission('browser:navigate', 'mail.google.com', perms2);

if (hasPerm3) {
    console.log('✅ Test 4: Wildcard scope success');
} else {
    console.error('❌ Test 4: Wildcard scope failed');
    process.exit(1);
}

console.log('🎉 CapabilityManager Verified!');
