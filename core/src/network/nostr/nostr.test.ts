import { describe, it, expect, vi } from 'vitest';
import { SimplePool, Filter } from 'nostr-tools';

// Use vi.hoisted to share variables with the mock factory
const { mockSubscribeMap, mockClose } = vi.hoisted(() => {
  return {
    mockSubscribeMap: vi.fn(),
    mockClose: vi.fn(),
  };
});

vi.mock('nostr-tools', () => {
  return {
    SimplePool: vi.fn().mockImplementation(function() {
      return {
        subscribeMap: mockSubscribeMap,
        subscribeMany: vi.fn(),
        close: mockClose,
        publish: vi.fn(),
      };
    }),
    getPublicKey: vi.fn(),
    finalizeEvent: vi.fn(),
  };
});

import { queryEvents } from './nostr';

describe('queryEvents', () => {
  it('should use subscribeMap to query events with multiple filters', async () => {
    mockSubscribeMap.mockReset();
    mockSubscribeMap.mockReturnValue({ close: vi.fn() });

    const relays = ['wss://relay1.com', 'wss://relay2.com'];
    const filters: Filter[] = [
      { kinds: [1], authors: ['abc'] },
      { kinds: [0], authors: ['def'] },
    ];

    const testPool = new SimplePool();

    const promise = queryEvents(testPool, relays, filters);

    expect(mockSubscribeMap).toHaveBeenCalledTimes(1);

    const [requests, callbacks] = mockSubscribeMap.mock.calls[0];

    expect(requests).toHaveLength(4);

    // Simulate EOSE asynchronously to allow `sub` to be assigned
    setTimeout(() => {
        callbacks.oneose();
    }, 0);

    await promise;
  });

  it('should collect events and resolve on EOSE', async () => {
    mockSubscribeMap.mockReset();

    const testPool = new SimplePool();
    const relays = ['wss://relay1.com'];
    const filters: Filter[] = [{ kinds: [1] }];

    mockSubscribeMap.mockImplementation((requests, callbacks) => {
      // Simulate events (can be sync)
      callbacks.onevent({ id: '1', kind: 1 });
      callbacks.onevent({ id: '2', kind: 1 });

      // Simulate EOSE asynchronously
      setTimeout(() => {
        callbacks.oneose();
      }, 0);

      return { close: vi.fn() };
    });

    const events = await queryEvents(testPool, relays, filters);

    expect(events).toHaveLength(2);
    expect(events).toEqual([
        { id: '1', kind: 1 },
        { id: '2', kind: 1 }
    ]);
  });
});
