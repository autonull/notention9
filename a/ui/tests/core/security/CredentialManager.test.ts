import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCredentialManager } from '@notention/core';

describe('InMemoryCredentialManager', () => {
  let manager: InMemoryCredentialManager;

  beforeEach(() => {
    manager = new InMemoryCredentialManager();
  });

  it('should store and retrieve credentials', async () => {
    await manager.storeCredential('test-service', 'user1', 'secret123');
    const secret = await manager.getCredential('test-service', 'user1');
    expect(secret).toBe('secret123');
  });

  it('should return null for missing credentials', async () => {
    const secret = await manager.getCredential('test-service', 'missing');
    expect(secret).toBeNull();
  });

  it('should delete credentials', async () => {
    await manager.storeCredential('test-service', 'user1', 'secret123');
    await manager.deleteCredential('test-service', 'user1');
    const secret = await manager.getCredential('test-service', 'user1');
    expect(secret).toBeNull();
  });

  it('should list credentials for a service', async () => {
    await manager.storeCredential('service-a', 'user1', 's1');
    await manager.storeCredential('service-a', 'user2', 's2');
    await manager.storeCredential('service-b', 'user3', 's3');

    const accounts = await manager.listCredentials('service-a');
    expect(accounts).toHaveLength(2);
    expect(accounts).toContain('user1');
    expect(accounts).toContain('user2');
  });
});
